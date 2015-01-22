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

(provide static dispatch verify make-ev-rkt make-ev)

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

(define (read-all-string str)
  (port->list (λ (x) (read-syntax "repl" x))
              (open-input-string str)))

(struct res (out val))
(define (make-ev/out ev)
  (λ (x)
    (define r (ev x))
    (res (get-output ev) r)))

(define (run bindings)
  (define expr-str (extract-binding/single 'expr bindings))
  (save-expr expr-str)
  (define exprs (map hack-require-clause (read-all-string expr-str)))
  (define %ev (make-ev-rkt))
  (define ev-rkt (make-ev/out %ev)) 
  (define ress+err    
    (let loop ([es exprs])
      (cond [(empty? es) '()]
            [else             
             (define res
               (with-handlers ([(λ (_) #t) (λ (exn) exn)])
                 (ev-rkt (first es))))
             (if (exn? res)
                 (list res)
                 (cons res (loop (rest es))))])))
     
  (when (evaluator-alive? %ev)
    (kill-evaluator %ev))
  
  (respond
   (let ()
     (define response
       (foldr
        (λ (res+exn js)
          (cond [(exn? res+exn) (cons (json-error res+exn) js)]
                [(res? res+exn) (list* (json-print (res-out res+exn))
                                       (json-result (res-val res+exn))
                                       js)]))
        '()
        ress+err))
     response)))
   
    

(define (verify bindings)
  (define expr (extract-binding/single 'expr bindings))
  (save-expr expr)
  (define start-time (current-process-milliseconds))
  (define (new-time msg)
    (define new (current-process-milliseconds))
    (log-info msg (- new start-time))
    (set! start-time new))
  (new-time "Verifying ... ~a")
  (define ev (make-ev))
  (new-time "Created evaluator for verifying ... ~a")
  
  (match-define-values
   ((list val) t₁ t₂ t₃) 
   (time-apply (λ ()
                 (with-handlers ([(λ (_) #t) (λ (exn) exn)])
                   (ev (list expr))))
               '()))
  
  (define out (get-output ev))

    
  (new-time "Finished verifying ... ~a")
  (when (evaluator-alive? ev)
    (kill-evaluator ev))
  (new-time "Killed evaluator ... ~a")  
  
  (define time-str (~r (* t₂ 0.001) #:precision 3))
 (respond
  (let ()
    (define response
      (let ()
        (define ans
          (cond [(exn? val) (json-error val)]
                [(not (string=? "" out)) (json-print out)]
                [else (json-result val)]))
        
        (list (hash-set ans 'time time-str))))    
    response)))

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



;; exn -> jsexpr
(define (json-error x)
  (hasheq 'error (exn-message x)))

;; val -> jsexpr
(define (json-result x)
  (hasheq 'result (format "~s" x)))

;; string -> jsexpr
(define (json-print x)
  (hasheq 'print x))


(define (save-expr expr)
  (define fn (format "~a/~a.sch" out-programs-path (current-milliseconds)))
  (display-to-file expr fn #:exists 'append))

