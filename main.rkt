#lang racket/base
(require web-server/servlet-env "server.rkt")

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
   #:extra-files-paths (list static "templates")
   #:servlet-path "/"
   #:log-file "try-racket-serve-log.txt"))
