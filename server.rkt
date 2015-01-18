#lang racket
(require "eval.rkt"
         json
         racket/sandbox
         racket/file
         racket/match
         racket/port
         racket/runtime-path
         racket/string
         racket/system
         racket/format
         web-server/servlet
         web-server/templates)

(provide static dispatch)

(define-runtime-path static "./static")

;;------------------------------------------------------------------
;; Routes
;;------------------------------------------------------------------
(define-values (dispatch urls)
  (dispatch-rules
   [("") home]
   [("home") home]
   [("about") about]
   [("eval") eval]))

;;------------------------------------------------------------------
;; Request Handlers
;;------------------------------------------------------------------
;; Home page
(define (home request)
  (make-response (include-template "templates/home.html")))

;; About page
(define (about request)
  (make-response
   (include-template "templates/about.html")))

;; Eval handler
(define (eval request)
  (define bindings (request-bindings request))
  (cond [(run? bindings) (run bindings)]
        [(verify? bindings) (verify bindings)]
        [else (bad request)]))

(define (run? bindings)
  (and (exists-binding? 'expr bindings) 
       (exists-binding? 'concrete bindings)))

(define (verify? bindings)
  (and (exists-binding? 'expr bindings) 
       (not (run? bindings))))

(define (run bindings)
  (define expr (hack-require-clause (extract-binding/single 'expr bindings)))  
  (define ev-rkt (make-ev-rkt))  
  (define val
    (with-handlers ([(λ (_) #t) (λ (exn) exn)])
      (ev-rkt expr)))
  (define out (get-output ev-rkt))
  (define res
    (list (list (if (void? val) "" (format "~s" val))
                (and (not (equal? "" out)) out)
                (and (exn? val) (exn-message val)))))
  (respond (result-json res)))

(define (verify bindings)
  (define start-time (current-process-milliseconds))
  (define (new-time msg)
    (define new (current-process-milliseconds))
    (log-info msg (- new start-time))
    (set! start-time new))
  (new-time "Verifying ... ~a")
  (define ev (make-ev))
  (new-time "Created evaluator for verifying ... ~a")
  (define expr (format #|HACK|# "(~a)" (extract-binding/single 'expr bindings)))
  (match-define-values ((list res) t₁ t₂ t₃) (time-apply run-code (list ev expr)))
  (new-time "Finished verifying ... ~a")
  (kill-evaluator ev)
  (new-time "Killed evaluator ... ~a")
  (define response
    (match-let ([(list response) (result-json res)]
                [time-str (~r (* t₂ 0.001) #:precision 3)])
      (list (hash-set response 'time time-str))))
  (respond response))

(define (bad request)
  (log-error "Bad request: ~a" request)
  (make-response #:code 400 #:message #"Bad Request" ""))

(define (respond jsexpr)
  (make-response
   #:mime-type #"application/json;charset=utf-8"
   (jsexpr->string jsexpr)))

(define out-root
  (match (current-command-line-arguments)
    [(vector path) (printf "Root is at: ~a~n" path) path]
    [_ (printf "Default root: ~a~n" "/tmp") "/tmp"]))
(define out-programs-path (format "~a/programs" out-root))
(unless (directory-exists? out-programs-path)
  (make-directory out-programs-path))

;; Loggings
(define (system/string s) (string-trim (with-output-to-string (λ () (system s)))))
(printf "Running from Racket at: ~a~n" (system/string "which racket"))
(printf "Using Z3 at: ~a~n" (system/string "which z3"))
(printf "Programs are logged at: ~a~n" out-programs-path)


;;------------------------------------------------------------------
;; sandbox
;;------------------------------------------------------------------

(define (run-code ev str)
  (define val (ev str))
  (define err
    ;; HACK: seems to work most of the time
    (match (get-error-output ev)
      [(regexp #rx"(.+)(context...:.+)" (list _ s _)) s]
      [s s]))
  (define out (get-output ev))

  ;; Log
  (save-expr
   (format "~a~n~n#|Result:~n~a~n~a~n~a~n|#~n" str val err out))

  (list (list (if (void? val) "" (format "~a" val))
              (and (not (equal? "" out)) out)
              (and (not (equal? "" err)) err))))

(define (complete-code ev str)
  (define res (ev  `(jsexpr->string (namespace-completion ,str))))
  (define out (get-output ev))
  (define err
    ;; HACK: seems to work most of the time
    (match (get-error-output ev)
      [(regexp #rx"(.+)(context...:.+)" (list _ s _)) s]
      [s s]))
  (list (if (void? res) "" res)
        (and (not (equal? out "")) out)
        (and (not (equal? err "")) err)))


;;------------------------------------------------------------------
;; Responses
;;------------------------------------------------------------------
;; make-response : ... string -> response
(define (make-response
         #:code [code 200]
         #:message [message #"OK"]
         #:seconds [seconds (current-seconds)]
         #:mime-type [mime-type TEXT/HTML-MIME-TYPE]
         #:headers [headers (list (make-header #"Cache-Control" #"no-cache"))]
         content)
  (response/full code message seconds mime-type headers
                 (list (string->bytes/utf-8 content))))



;; string -> jsexpr
(define (json-error msg)
  (hasheq 'error #true 'message msg))

;; string -> jsexpr
(define (json-result res)
  (hasheq 'result res))

;; (Listof eval-result) -> (Listof jsexpr)
(define (result-json lsts)
  (for/list ([lst lsts])
    (match lst
      [(list res #f #f)
       (json-result res)]
      [(list res out #f)
       (json-result (string-append out res))]
      [(list _ _ err)
       (json-error err)])))

(define (save-expr expr)
  (define fn (format "~a/~a.sch" out-programs-path (current-milliseconds)))
  (display-to-file expr fn #:exists 'append))

;; Replace each `(submod ".." name)` with `'name`
(define (hack-require-clause sexpr)
  (define replace
    (match-lambda
      [`(submod ".." ,name) `(quote ,name)]
      [(list xs ...) (map replace xs)]
      [x x]))
  (replace sexpr))
