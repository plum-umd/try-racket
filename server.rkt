#lang racket/base

(require "eval.rkt"
         json
         racket
         racket/sandbox
         racket/dict
         racket/file
         racket/match
         racket/port
         racket/runtime-path
         racket/string
         racket/system
         racket/format
         web-server/managers/lru
         web-server/servlet
         web-server/templates)

(provide dispatch mgr static)

(define APPLICATION/JSON-MIME-TYPE #"application/json;charset=utf-8")

(module+ test (require rackunit))

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
;; Routes
;;------------------------------------------------------------------
(define-values (dispatch urls)
  (dispatch-rules
   [("") home]
   [("home") home]
   [("about") about]
   [("eval") eval-with]))

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

;;------------------------------------------------------------------
;; Request Handlers
;;------------------------------------------------------------------
;; About page
(define (about request)
  (make-response
   (include-template "templates/about.html")))

;; Home page
(define (home request)
  (make-response (include-template "templates/home.html")))

;; string string -> jsexpr
(define (json-error expr msg)
  (hasheq 'expr expr 'error #true 'message msg))

;; string string -> jsexpr
(define (json-result expr res)
  (hasheq 'expr expr 'result res))

;; string (Listof eval-result) -> (Listof jsexpr)
(define (result-json expr lsts)
  (for/list ([lst lsts])
    (match lst
      [(list res #f #f)
       (json-result expr res)]
      [(list res out #f)
       (json-result expr (string-append out res))]
      [(list _ _ err)
       (json-error expr err)])))

;; Eval handler
(define (eval-with request)
  (define bindings (request-bindings request))
  (cond
    ;; the "Run" button
    [(and (exists-binding? 'expr bindings) (exists-binding? 'concrete bindings))
     (define expr (hack-require-clause (extract-binding/single 'expr bindings)))
     #;(printf "Run: ~a~n" expr)

     (define ev-rkt (make-ev-rkt))

     (define val (ev-rkt expr))
     (define err
       ;; HACK: seems to work most of the time
       (match (get-error-output ev-rkt)
         [(regexp #rx"(.+)(context...:.+)" (list _ s _)) s]
         [s s]))
     (define out (get-output ev-rkt))
     (define res
       (list (list (if (void? val) "" (format "~a" val))
                   (and (not (equal? "" out)) out)
                   (and (not (equal? "" err)) err))))
     #;(printf "Res: ~a~n" (jsexpr->string (result-json expr res)))
     (make-response
      #:mime-type APPLICATION/JSON-MIME-TYPE
      (jsexpr->string (result-json expr res)))]
    ;; The "Verify" button
    [(exists-binding? 'expr bindings)
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
       (match-let ([(list response) (result-json expr res)]
                   [time-str (~r (* t₂ 0.001) #:precision 3)])
         (list (hash-set response 'time time-str))))
     (make-response
      #:mime-type APPLICATION/JSON-MIME-TYPE
      (jsexpr->string response))]
    ;; Something went wrong.
    [else
     (log-error "Bad request: ~a" request)
     (make-response #:code 400 #:message #"Bad Request" "")]))

(define (save-expr expr)
  (define fn (format "~a/~a.sch" out-programs-path (current-milliseconds)))
  (display-to-file expr fn #:exists 'append))


;;------------------------------------------------------------------
;; Server
;;------------------------------------------------------------------
(define (ajax? req)
  (string=? (dict-ref (request-headers req) 'x-requested-with "")
            "XMLHttpRequest"))

(define (expiration-handler req)
  (if (ajax? req)
      (make-response
       #:mime-type APPLICATION/JSON-MIME-TYPE
       (jsexpr->string
        (json-error "" "Sorry, your session has expired. Please reload the page.")))
      (response/xexpr
       `(html (head (title "Page Has Expired."))
	      (body (p "Sorry, this page has expired. Please reload the page."))))))


(define-runtime-path static "./static")

(define mgr
  (make-threshold-LRU-manager expiration-handler (* 256 1024 1024)))

;; Replace each `(submod ".." name)` with `'name`
(define (hack-require-clause str)
  (define replace
    (match-lambda
      [`(submod ".." ,name) `(quote ,name)]
      [(list xs ...) (map replace xs)]
      [(? string? s) (format "\"~a\"" s)]
      [x x]))
  (define converted (replace (with-input-from-string (format "(~a)" str) read)))
  (string-join
   (for/list ([sexp converted])
     (format "~a" sexp))
   "\n"))
