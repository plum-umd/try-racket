#lang racket/base

(require web-server/servlet
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
         racket/system
         racket/string
         web-server/managers/lru
         web-server/managers/manager
         file/convertible
         net/base64
         ;          racket/gui/base ; ensures that `make-ev` does not try to instantiate it multiple times
         racket/string
         racket/port
         racket/list
         racket/file
         racket/promise
         rackunit
         "../server.rkt")

(define dummy-url (url #f #f #f #f #f null null #f))

;; Bytes -> Json
(define (verify s)
  (define req
    (request #"" dummy-url null (delay (list (binding:form #"expr" s))) #f "" 0 ""))
  (define res (eval-with (make-ev) req))
  (string->jsexpr
   (with-output-to-string
       (λ ()
         ((response-output res) (current-output-port))))))

;; Bytes -> Hash
(define (check-unique-result s)
  (define reses (verify s))
  (check-true (list? reses))
  (check-equal? 1 (length reses))
  (define res (car reses))
  (check-true (hash? res))
  res)

;; Bytes -> Void
;; Check whether program is safe
(define (check-verify-safe s)
  (define res (check-unique-result s))
  (check-true (hash-has-key? res 'result))
  (define msg (hash-ref res 'result))
  (check-regexp-match ".*Program is safe.*" msg))

;; Bytes -> Void
;; Check whether program fails, optionally enforcing a counterexample
(define (check-verify-fail s [counter-example? #f])
  (define res (check-unique-result s))
  (check-true (hash-has-key? res 'error))
  (check-true (hash-has-key? res 'message))
  (define msg (hash-ref res 'message))
  (check-regexp-match ".*Contract violation.*" msg)
  (when counter-example?
    (check-regexp-match ".*An example module that breaks it.*" msg)))

(for ([file (in-directory "safe")])
  (test-case (path->string file)
             (check-verify-safe (file->bytes file))))

(for ([file (in-directory "fail")])
  (test-case (path->string file)
             (check-verify-fail (file->bytes file))))

(for ([file (in-directory "fail-ce")])
  (test-case (path->string file)
             (check-verify-fail (file->bytes file) #t)))
