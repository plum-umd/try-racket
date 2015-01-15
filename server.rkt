#lang racket/base

(require json
         racket/dict
         racket/file
         racket/local
         racket/match
         racket/port
         racket/runtime-path
         racket/sandbox
         racket/string
         racket/system
         racket/pretty
         web-server/dispatch
         web-server/http
         web-server/managers/lru
         web-server/servlet
         web-server/templates)

(provide (all-defined-out))

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


;; Paths
(define autocomplete
  (build-path (current-directory) "autocomplete.rkt"))

;;------------------------------------------------------------------
;; sandbox
;;------------------------------------------------------------------
;; make-ev : -> evaluator

(define next!
  (let ([x 0])
    (λ ()
      (begin0 x (set! x (add1 x))))))

;; Make sandboxed soft-contract evaluator
(define (make-ev)
  (parameterize ([sandbox-output 'string]
                 [sandbox-error-output 'string]
                 [sandbox-propagate-exceptions #f]
                 [sandbox-memory-limit 400]
                 [sandbox-eval-limits (list 20 400)]
                 [sandbox-namespace-specs
                  (append (sandbox-namespace-specs)
                          `(file/convertible
                            json))]
                 [sandbox-path-permissions (list* ; FIXME hack²
                                            (list 'exists "/")
                                            ;; execute below is fine for now because SCV doesn't have side effects
                                            ;; we need this to run Z3
                                            (list 'execute "/bin/sh")
                                            '((read #rx#"racket-prefs.rktd")))])
    (make-evaluator 'soft-contract)))

;; Make sandboxed Racket evaluator
(define (make-ev-rkt)
  (parameterize ([sandbox-output 'string]
                 [sandbox-error-output 'string]
                 [sandbox-propagate-exceptions #f]
                 [sandbox-memory-limit 200]
                 [sandbox-eval-limits (list 2 200)]
                 [sandbox-namespace-specs
                  (append (sandbox-namespace-specs)
                          `(file/convertible
                            json))]
                 [sandbox-path-permissions '((read #rx#"racket-prefs.rktd"))])
    (make-evaluator 'racket)))

;; Handle arbitrary number of results, gathered into a list
(define-syntax-rule (zero-or-more e)
  (call-with-values (λ () e) (λ xs xs)))

(define-syntax-rule (define/memo (f x ...) e ...)
  (define f
    (let ([m (make-weak-hash)])
      (λ (x ...)
        (hash-ref! m (list x ...) (λ () e ...))))))

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
     [("links") links]
     [("about") about]))

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
;; Links page
(define (links request)
    (make-response
     (include-template "templates/links.html"))) 

;; About page
(define (about request)
    (make-response
     (include-template "templates/about.html"))) 

;; Home page
(define (home request)
  (home-with (make-ev) request))
  
(define (home-with ev request) 
  (local [(define (response-generator embed/url)
            (let ([url (embed/url next-eval)]
                  ;[complete-url (embed/url next-complete)]
                  )
              (make-response
               (include-template "templates/home.html"))))
            (define (next-eval request)
              (eval-with ev request))
            ;(define (next-complete request)(complete-with ev request))
            ]
      (send/suspend/dispatch response-generator)))

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
(define (eval-with ev request) 
  (define bindings (request-bindings request))
  (cond [(and (exists-binding? 'expr bindings) (exists-binding? 'concrete bindings))
         ;; TODO: hack + code dup. This case ignores `ev` and makes a new evaluator.
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
        [(exists-binding? 'expr bindings)
         (define expr (format #|HACK|# "(~a)" (extract-binding/single 'expr bindings)))
         (make-response
          #:mime-type APPLICATION/JSON-MIME-TYPE
          (jsexpr->string (result-json expr (run-code ev expr))))]
        [(exists-binding? 'complete bindings)
         (define str (extract-binding/single 'complete bindings))
         (make-response 
          #:mime-type APPLICATION/JSON-MIME-TYPE
          (jsexpr->string 
           (result-json "" (complete-code ev str))))]
        [else (make-response #:code 400 #:message #"Bad Request" "")]))

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
