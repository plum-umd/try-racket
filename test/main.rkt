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
(define (verify-bytes s)
  (define req
    (request #"" dummy-url null (delay (list (binding:form #"expr" s))) #f "" 0 ""))
  (define res (verify req))
  (string->jsexpr
   (with-output-to-string
       (λ ()
         ((response-output res) (current-output-port))))))

;; Bytes -> Hash
(define (check-unique-result s)
  (define reses (verify-bytes s))
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
  (check-regexp-match ".*ontract violation.*" msg)
  (when counter-example?
    (check-regexp-match ".*An example module that breaks it.*" msg)))

;; Bytes -> Void
;; Makes sure the program is not allowed to run with full Racket
(define (check-run-denied s)
  (define ev (make-ev-rkt))
  (define res (ev s))
  (define out (get-output ev))
  (define err (get-error-output ev))
  (check-equal? "" out)
  (check-regexp-match ".*access denied.*" err))

(define (test-dir dir-name test-func)
  (for ([file (in-directory dir-name)]
        #:when (regexp-match-exact? #rx".*rkt" (path->string file)))
    (printf "Testing: ~a~n" file)
    (test-case (path->string file)
               (test-func (file->bytes file)))))

(test-dir "safe" check-verify-safe)
(test-dir "fail" check-verify-fail)
(test-dir "fail-ce" (λ (s) (check-verify-fail s #t)))
(test-dir "run-denied" check-run-denied)
