#lang racket/base
(require  web-server/servlet
          web-server/servlet-env
          web-server/templates
          web-server/dispatch
          web-server/http
          racket/sandbox
          json
          racket/format
          racket/dict
          racket/match
          racket/local
          racket/runtime-path
          web-server/managers/lru
          web-server/managers/manager
          file/convertible
          net/base64
;          racket/gui/base ; ensures that `make-ev` does not try to instantiate it multiple times
          "autocomplete.rkt"
          )

(define APPLICATION/JSON-MIME-TYPE #"application/json;charset=utf-8")

(module+ test (require rackunit))


;; Paths
(define autocomplete
  (build-path (current-directory) "autocomplete.rkt"))

;;------------------------------------------------------------------
;; sandbox
;;------------------------------------------------------------------
;; make-ev : -> evaluator


(define (make-ev)
  (parameterize ([sandbox-output 'string]
                 [sandbox-error-output 'string]
                 [sandbox-propagate-exceptions #f]
                 [sandbox-memory-limit 100]
                 [sandbox-eval-limits (list 5 100)]
                 [sandbox-namespace-specs
                  (append (sandbox-namespace-specs)
                          `(file/convertible
                            json))]
                 [sandbox-path-permissions (list* ; FIXME hack³
                                            (list 'write "/var/tmp")
                                            (list 'write "/tmp")
                                            (list 'execute "/bin/sh")
                                            '((read #rx#"racket-prefs.rktd")))])
    (make-evaluator 'scpcf/heap/lang)))

;; (Listof jsexpr -> jsexpr)
(define (hack-result-list reses)
  (for/fold ([acc (hasheq)]) ([res reses])
    (match res
      [(hash-table ['expr expr] ['error _] ['message msg] _ ...)
       (hash-update
        (hash-set acc 'expr expr)
        'result ; HACK
        (λ (msg0) (format "~a~n~a" msg0 msg))
        (λ () ""))]
      [(hash-table ['expr expr] ['result result] _ ...)
       (hash-update
        (hash-set acc 'expr expr)
        'result
        (λ (result0) (format "~a~n~a" result0 result))
        (λ () ""))])))

;; Handle arbitrary number of results, gathered into a list
(define-syntax-rule (zero-or-more e)
  (call-with-values (λ () e) (λ xs xs)))

(define (run-code ev str)
  (define vals (zero-or-more (ev str))) 
  (define errs (zero-or-more (get-error-output ev)))
  (append
   (for/list ([val vals]) (list (format "~a" val) #f #f))
   (for/list ([err errs] #:unless (equal? err "")) (list "" #f err))))

(define (complete-code ev str)
  (define res (ev  `(jsexpr->string (namespace-completion ,str)))) 
  (define out (get-output ev))
  (define err (get-error-output ev))  
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
     [("about") about]
     [("tutorial") #:method "post" tutorial]))

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
;; Tutorial pages
(define (tutorial request)
  (define page (dict-ref (request-bindings request) 'page #f))
  (make-response
   (match page
     ("intro" (include-template "templates/tutorial/intro.html"))
     ("go" (include-template "templates/tutorial/go.html"))
     ("definitions" (include-template "templates/tutorial/definitions.html"))
     ("binding" (include-template "templates/tutorial/binding.html"))
     ("functions" (include-template "templates/tutorial/functions.html"))
     ("scope" (include-template "templates/tutorial/scope.html"))
     ("lists" (include-template "templates/tutorial/lists.html"))
     ("modules" (include-template "templates/tutorial/modules.html"))
     ("macros" (include-template "templates/tutorial/macros.html"))
     ;("objects" (include-template "templates/tutorial/objects.html"))
     ("where" (include-template "templates/tutorial/where.html"))
     ("end" (include-template "templates/tutorial/end.html")))))
    



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


(module+ test
 (define ev (make-ev))
 (define (eval-result-to-json expr)
   (jsexpr->string
   (hash-ref (result-json "" (run-code ev expr)) 'result)))
 (define (eval-error-to-json expr)
   (jsexpr->string
   (hash-ref (result-json "" (run-code ev expr)) 'message)))
   
 (check-equal? 
  (eval-result-to-json "(+ 3 3)") "\"6\"")
 (check-equal? 
  (eval-result-to-json "(display \"6\")") "\"6\"")
 (check-equal? 
  (eval-result-to-json "(write \"6\")") "\"\\\"6\\\"\"")
 (check-equal? 
  (eval-result-to-json "(begin (display \"6 + \") \"6\")") "\"6 + \\\"6\\\"\"")
)  

;; Eval handler
(define (eval-with ev request) 
  (define bindings (request-bindings request))
  (cond [(exists-binding? 'expr bindings)
         (let ([expr (extract-binding/single 'expr bindings)])
           (make-response
            #:mime-type APPLICATION/JSON-MIME-TYPE
            (jsexpr->string (hack-result-list (result-json expr (run-code ev expr))))))]
         [(exists-binding? 'complete bindings)
          (let ([str (extract-binding/single 'complete bindings)])
            (make-response 
             #:mime-type APPLICATION/JSON-MIME-TYPE
             (jsexpr->string 
              (result-json "" (complete-code ev str)))))]
        [else (make-response #:code 400 #:message #"Bad Request" "")]))
      


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
;  (create-LRU-manager expiration-handler 5 60
;   (lambda ()
;     (define memory-use (current-memory-use))
;     (define collect? 
;       (or (>= memory-use (* 256 1024 1024)) (< memory-use 0)))
;     collect?)
;   #:initial-count 15
;   #:inform-p (lambda args (void))))

(module+ main
  (serve/servlet
   dispatch
   #:stateless? #f       
   #:launch-browser? #f
   #:connection-close? #t
   #:quit? #f 
   #:listen-ip #f 
   #:port 8080
   #:servlet-regexp #rx""
   #:extra-files-paths (list static)
   #:servlet-path "/"
   #:manager mgr
   #:log-file "try-racket-serve-log.txt"))



