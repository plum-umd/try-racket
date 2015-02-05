function loadExamples() {
    var selections = document.getElementById("examples");
    for (var exampleName in examples) {
        var option = document.createElement("option");
        var a = document.createAttribute("value");
        a.value = exampleName;
        var t = document.createTextNode(exampleName)
        option.appendChild(t);
        option.setAttributeNode(a);
        if (exampleName === "div100") {
            var b = document.createAttribute("selected");
            b.value = "selected";
            option.setAttributeNode(b);
        }
        selections.appendChild(option);
    }
    loadExample("div100");
}

function loadExample(exampleName) {
    document.getElementById("console").value = examples[exampleName];
    myCodeMirror.setValue(document.getElementById("console").value)
    setExampleText(example_texts[exampleName]);
    return false;
}

function copy() {
    document.getElementById("console").value = myCodeMirror.getValue();
}

function setupLink(url) {
    return function(e) { $("#changer").load(url, function(data) { $("#changer").html(data); }); }
}

function setupExamples(controller) {
    $(".code").click(function(e) {
        controller.promptText($(this).text());
    });
}

function getStep(n, controller) {
    $("#tuttext").load("tutorial", { step: n }, function() { setupExamples(controller); });
}


function verify_racket(code) {
    var data;
    $.ajax({
        url: evalUrl,
        data: { expr : code },
        async: false,
        success: function(res) { data = res; },
    });
    return data;
}

function run_racket(code) {
    var data;
    $.ajax({
        url: evalUrl,
        data: { expr : code , concrete : true},
        async: false,
        success: function(res) { data = res; },
    });
    return data;
}

function test_racket(code) {
    var data;
    $.ajax({
        url: evalUrl,
        data: { expr : code , asdf : true},
        async: false,
        success: function(res) { data = res; },
    });
    return data;
}

function check() {
    setMessage("Verifying...", "timeout");
    console.log("About to verify");
    var results = verify_racket(document.getElementById("console").value);
    console.log("Results:");
    console.log(results);
    setResult(results);
}

function test() {
    setMessage("Running random tests...", "timeout");
    console.log("About to random test");
    var results = test_racket(document.getElementById("console").value);
    console.log("Results:");
    console.log(results);
    setResult(results);
}

function setResult(results) {
    console.log("Results:");
    console.log(results);
    setMessage("");
    var out_p = false;
    for (var i in results) {
	var result = results[i];
	if (result.result === "#<void>") {
	    addMessage("", "value");
	} else if (result.print) {
	    if (!(result.print === "")) out_p = true;
	    addMessage(result.print, "print");
	} else if (result.error) {
	    out_p = true;
	    addMessage(result.error + msg_time(result) + "\n", "error");
	} else if (result.result) {
	    out_p = true;
	    addMessage(result.result + msg_time(result) + "\n", "value");
	}
    }
    if (!out_p) { addMessage("(Program run with no output)", "value")};
}

function msg_time(result) {
    if (result.time) {
	return "\n (Verification takes " + result.time + "s)";
    } else {
	return "";
    }
}

function setExampleText(msg){
    // Clear previous message
    var example_text = document.getElementById("example_text");
    while (example_text.firstChild) {
    example_text.removeChild(example_text.firstChild);
    }
    // Append new message
    example_text.appendChild(createP(msg, "text"));
}

function setMessage(msg, classs) {
    console.log("setMessage:");
    console.log([msg, classs]);
    // Clear previous message
    var changer = document.getElementById("changer_result");
    while (changer.firstChild) {
    changer.removeChild(changer.firstChild);
    }
    // Append new message
    changer.appendChild(createP(msg, classs));
}

function addMessage(msg, classs) {
    console.log("addMessage:");
    console.log([msg, classs]);
    var changer = document.getElementById("changer_result");
    changer.appendChild(createP(msg, classs));
}
    

function createP(text, classs) {
    var p = document.createElement("span");
    var t = document.createTextNode(text);
    var a = document.createAttribute("class");
    a.value = classs;
    p.appendChild(t);
    p.setAttributeNode(a);
    return p;
}

/**
 * This should be called anytime the changer div is updated so it can rebind event listeners.
 * Currently this is just to make the code elements clickable.
 */
function changerUpdated() {
    $("#changer code.expr").each(function() {
        $(this).css("cursor", "pointer");
        $(this).attr("title", "Click to insert '" + $(this).text() + "' into the console.");
        $(this).click(function(e) {
            controller.promptText($(this).text());
            controller.inner.click();
            // trigger Enter
            var e = jQuery.Event("keydown");
            e.keyCode = 13; 
            controller.typer.trigger(e);
        });
    });
}

function run() {
    setMessage("Running...", "timeout");
    console.log("About to run");
    var results = run_racket(document.getElementById("console").value);
    console.log("Results:");
    console.log(results);
    setResult(results);
}

// EXAMPLE DATA BELOW:

var examples = {
  argmin_unsafe: "(module argmin racket\
\n  (provide\
\n    (contract-out\
\n      [argmin ((any/c . -> . number?) (cons/c any/c (listof any/c)) . -> . any/c)]))\
\n\
\n  ;; Produce the element that minimizes f\
\n  (define (argmin f xs)\
\n    (argmin/acc f (car xs) (f (car xs)) (cdr xs)))\
\n\
\n  (define (argmin/acc f a b xs)\
\n    (if (empty? xs)\
\n        a\
\n        (if (< b (f (car xs)))\
\n            (argmin/acc f a b (cdr xs))\
\n            (argmin/acc f (car xs) (f (car xs)) (cdr xs))))))",

  argmin_safe: "(module argmin racket\
\n  (provide\
\n    (contract-out\
\n      [argmin ((any/c . -> . real?) (cons/c any/c (listof any/c)) . -> . any/c)]))\
\n\
\n  ;; Produce the element that minimizes f\
\n  (define (argmin f xs)\
\n    (argmin/acc f (car xs) (f (car xs)) (cdr xs)))\
\n\
\n  (define (argmin/acc f a b xs)\
\n    (if (empty? xs)\
\n        a\
\n        (if (< b (f (car xs)))\
\n            (argmin/acc f a b (cdr xs))\
\n            (argmin/acc f (car xs) (f (car xs)) (cdr xs))))))",

  braun_tree:"(module tree racket\
\n  (provide\
\n   (contract-out\
\n    [braun-tree? (any/c . -> . boolean?)]\
\n    [insert (braun-tree? any/c . -> . braun-tree?)]))\
\n  \
\n  (struct node (v l r))\
\n\
\n  (define (braun-tree? x)\
\n    (or (false? x)\
\n        (and (node? x)\
\n             (braun-tree? (node-l x))\
\n             (braun-tree? (node-r x))\
\n             (let ([l (size (node-l x))]\
\n                   [r (size (node-r x))])\
\n               (or (= l r) (= l (add1 r)))))))\
\n  \
\n  (define (size x)\
\n    (if (node? x)\
\n        (add1 (+ (size (node-l x)) (size (node-r x))))\
\n        0))\
\n  \
\n  (define (insert bt x)\
\n    (if (node? bt)\
\n        (node (node-v bt) (insert (node-l bt) x) (node-r bt))\
\n        (node x #f #f))))",

  div100: "(module f racket\
\n  (provide (contract-out [f (integer? . -> . integer?)]))\
\n  (define (f n)\
\n    (/ 1 (- 100 n))))",

  dynamic_tests: "(module f racket\
\n  (provide\
\n   (contract-out\
\n    [f ((or/c number? string?) cons? . -> . number?)]))\
\n  (define (f input extra)\
\n    (cond\
\n      [(and (number? input) (number? (car extra)))\
\n       (+ input (car extra))]\
\n      [(number? (car extra))\
\n       (+ (string-length input) (car extra))]\
\n      [else 0])))",

  foldl1: "(module foldl1 racket\
\n  (provide\
\n    (contract-out\
\n      [foldl1 ((any/c any/c . -> . any/c) (listof any/c) . -> . any/c)]))\
\n  (define (foldl1 f xs)\
\n    (let ([z (car xs)]\
\n          [zs (cdr xs)])\
\n      (if (empty? zs) z\
\n          (foldl1 f (cons (f z (car zs)) (cdr zs)))))))",

  get_path: "(module lib racket\
\n  (provide\
\n   (contract-out\
\n    [path/c any/c]\
\n    [dom/c any/c]))\
\n  (define path/c\
\n    (->i ([msg (one-of/c \"hd\" \"tl\")])\
\n   (res (msg) (cond [(equal? msg \"hd\") string?]\
\n            [else (or/c false? path/c)]))))\
\n  (define dom/c\
\n    (->i ([msg (one-of/c \"get-child\")])\
\n   (res (msg) (string? . -> . dom/c)))))\
\n\
\n(module get-path racket\
\n  (provide (contract-out [get-path (dom/c path/c . -> . dom/c)]))\
\n  (require (submod \"..\" lib))\
\n  (define (get-path root p)\
\n    (while root p))\
\n  (define (while cur path)\
\n    (if (and (not (false? path)) (not (false? cur)))\
\n        (while ((cur \"get-child\") (path \"hd\"))\
\n          (path \"hd\" #;\"tl\"))\
\n        cur)))",

  last: "(module Y racket\
\n  (provide\
\n   (contract-out\
\n    [Y (([any/c . -> . any/c] . -> . [any/c . -> . any/c])\
\n        . -> . [any/c . -> . any/c])]))\
\n  (define (Y f)\
\n    (λ (y)\
\n      (((λ (x) (f (λ (z) ((x x) z))))\
\n        (λ (x) (f (λ (z) ((x x) z)))))\
\n       y))))\
\n\
\n(module last racket\
\n  (require (submod \"..\" Y))\
\n  (provide (contract-out [last ((listof any/c) . -> . any/c)]))\
\n  (define (last l)\
\n    ((Y (λ (f)\
\n          (λ (x)\
\n            (if (empty? (cdr x)) (car x) (f (cdr x))))))\
\n     l)))",

  last_pair: "(module lastpair racket\
\n  (provide\
\n   (contract-out [lastpair (cons? . -> . cons?)]))\
\n  (define (lastpair x)\
\n    (if (cons? x) (lastpair (cdr x)) x)))",

  fact: "(module factorial racket\
\n  (define (fact x)\
\n    (if (zero? x)\
\n        1\
\n        (* x (fact (sub1 x)))))\
\n  \
\n  (provide\
\n   (contract-out\
\n    [fact (-> (>=/c 0) (>=/c 0))])))",

  ext: "(module m racket\
\n  (provide (contract-out [f ((integer? . -> . integer?) . -> . \
\n                             (integer? . -> . true?))]))\
\n  (define (f g)\
\n    (λ (n)\
\n      (= (g n) (g n)))))",

  dependent: "(module square racket\
\n  (provide (contract-out\
\n            [sqr (->i ([x integer?])\
\n                      [res (x) (>=/c x)])]))\
\n  (define (sqr n)\
\n    (* n n)))",

fail_ce_flatten:"(module lib racket\n  (provide/contract [append ((listof any/c) (listof any/c) . -> . (listof any/c))]))\n\n(module flatten racket\n  (provide/contract [flatten (any/c . -> . (listof any/c))])\n  (require (submod \"..\" lib))\n  (define (flatten x)\n    (cond\n      [(empty? x) empty]\n      [(cons? x) (append [flatten (car x)] (cdr x) #|HERE|##;[flatten ])]\n      [else (cons x empty)])))\n\n(require 'flatten)\n(flatten •)\n\n"
,
fail_ce_foldr:"(module foldr racket\n  (provide/contract\n   [foldr ((number? boolean? . -> . boolean?) boolean? (listof any/c) . -> . boolean?)])\n  (define (foldr f z xs)\n    (if (empty? xs) z\n        (f #|HERE|# (foldr f z (cdr xs)) (car xs)))))\n\n(require 'foldr)\n(foldr • • •)\n\n"
,
fail_ce_recip:"(module recip racket\n  (provide/contract\n   [recip (number? . -> . non-zero/c)]\n   [non-zero/c any/c])\n  (define (recip x) (/ 1 x))\n  (define non-zero/c (and/c number? (not/c zero?))))\n\n(require 'recip)\n(recip •)\n\n"
,
fail_ce_tetris:"(module data racket\n  (provide/contract\n   [struct block ([x number?] [y number?] [color COLOR/C])]\n   [struct posn ([x number?] [y number?])]\n   [struct tetra ([center POSN/C] [blocks BSET/C])]\n   [struct world ([tetra TETRA/C] [blocks BSET/C])]\n   [posn=? (POSN/C POSN/C . -> . boolean?)]\n   [COLOR/C any/c]\n   [POSN/C any/c]\n   [BLOCK/C any/c]\n   [TETRA/C any/c]\n   [WORLD/C any/c]\n   [BSET/C any/c])\n  (define BSET/C (listof BLOCK/C))\n  (define COLOR/C symbol?)\n  (define POSN/C (struct/c posn number? number?))\n  (define BLOCK/C (struct/c block number? number? COLOR/C))\n  (define TETRA/C (struct/c tetra POSN/C BSET/C))\n  (define WORLD/C (struct/c world TETRA/C BSET/C))\n  \n  (struct posn (x y))\n  (struct block (x y color))\n  (struct tetra (center blocks))\n  (struct world (tetra blocks))\n  \n  (define (posn=? p1 p2)\n    (and (= (posn-x p1) (posn-x p2))\n         (= (posn-y p1) (posn-y p2)))))\n\n(module consts racket\n  (provide/contract\n   [block-size integer?]\n   [board-width integer?]\n   [board-height integer?])\n  (define block-size 20)\n  (define board-height 20)\n  (define board-width 10))\n\n(module block racket\n  (provide/contract\n   [block-rotate-ccw (POSN/C BLOCK/C . -> . BLOCK/C)]\n   [block-rotate-cw (POSN/C BLOCK/C . -> . BLOCK/C)]\n   [block=? (BLOCK/C BLOCK/C . -> . boolean?)]\n   [block-move (number? number? BLOCK/C . -> . BLOCK/C)])\n  (require (submod \"..\" data))\n  \n  ;; block=? : Block Block -> Boolean\n  ;; Determines if two blocks are the same (ignoring color).\n  (define (block=? b1 b2)\n    (and (= (block-x b1) (block-x b2))\n         (= (block-y b1) (block-y b2))))\n  \n  ;; block-move : Number Number Block -> Block\n  (define (block-move dx dy b)\n    (block (+ dx (block-x b))\n           (+ dy (block-y b))\n           (block-color b)))\n  \n  ;; block-rotate-ccw : Posn Block -> Block\n  ;; Rotate the block 90 counterclockwise around the posn.\n  (define (block-rotate-ccw c b)\n    (block (+ (posn-x c) (- (posn-y c) (block-y b)))\n           (+ (posn-y c) (- (block-x b) (posn-x c)))\n           (block-color b)))\n  \n  ;; block-rotate-cw : Posn Block -> Block\n  ;; Rotate the block 90 clockwise around the posn.\n  (define (block-rotate-cw c b)\n    (block-rotate-ccw c (block-rotate-ccw c (block-rotate-ccw c b)))))\n\n(module list-fun racket\n  (provide/contract\n   [max (number? number? . -> . number?)]\n   [min (number? number? . -> . number?)]\n   [ormap ([BLOCK/C . -> . boolean?] (listof any/c) . -> . boolean?)]\n   [andmap ([BLOCK/C . -> . boolean?] (listof any/c) . -> . boolean?)]\n   [map ([BLOCK/C . -> . BLOCK/C] BSET/C . -> . BSET/C)]\n   [filter ([BLOCK/C . -> . boolean?] BSET/C . -> . BSET/C)]\n   [append (BSET/C BSET/C . -> . BSET/C)]\n   [length ((listof any/c) . -> . integer?)]\n   [foldr ([BLOCK/C BSET/C . -> . BSET/C] BSET/C BSET/C . -> . BSET/C)]\n   [foldr-i ([BLOCK/C image? . -> . image?] image? BSET/C . -> . image?)]\n   [foldr-n ((BLOCK/C number? . -> . number?) number? BSET/C . -> . number?)])\n  (require (submod \"..\" image) (submod \"..\" data)))\n\n(module bset racket\n  (provide/contract\n   [blocks-contains? (BSET/C BLOCK/C . -> . boolean?)]\n   [blocks=? (BSET/C BSET/C . -> . boolean?)]\n   [blocks-subset? (BSET/C BSET/C . -> . boolean?)]\n   [blocks-intersect (BSET/C BSET/C . -> . BSET/C)]\n   [blocks-count (BSET/C . -> . number?)]\n   [blocks-overflow? (BSET/C . -> . boolean?)]\n   [blocks-move (number? number? BSET/C . -> . BSET/C)]\n   [blocks-rotate-cw (POSN/C BSET/C . -> . BSET/C)]\n   [blocks-rotate-ccw (POSN/C BSET/C . -> . BSET/C)]\n   [blocks-change-color (BSET/C COLOR/C . -> . BSET/C)]\n   [blocks-row (BSET/C number? . -> . BSET/C)]\n   [full-row? (BSET/C number? . -> . boolean?)]\n   [blocks-union (BSET/C BSET/C . -> . BSET/C)]\n   [blocks-max-x (BSET/C . -> . number?)]\n   [blocks-min-x (BSET/C . -> . number?)]\n   [blocks-max-y (BSET/C . -> . number?)])\n  (require (submod \"..\" data) (submod \"..\" block) (submod \"..\" list-fun) (submod \"..\" consts))\n  \n  ;; blocks-contains? : BSet Block -> Boolean\n  ;; Determine if the block is in the set of blocks.\n  (define (blocks-contains? bs b)\n    (ormap (λ (c) (block=? b c)) bs))\n  \n  ;; blocks-subset? : BSet BSet -> Boolean\n  ;; is every element in bs1 also in bs2?\n  (define (blocks-subset? bs1 bs2)\n    (andmap (λ (b) (blocks-contains? bs2 b)) bs1))\n  \n  ;; blocks=? : BSet BSet -> Boolean\n  ;; Determine if given sets of blocks are equal.\n  (define (blocks=? bs1 bs2)\n    (and (blocks-subset? bs1 bs2)\n         (blocks-subset? bs2 bs1)))\n  \n  ;; blocks-intersect : BSet BSet -> BSet\n  ;; Return the set of blocks that appear in both sets.\n  (define (blocks-intersect bs1 bs2)\n    (filter (λ (b) (blocks-contains? bs2 b)) bs1))\n  \n  ;; blocks-count : BSet -> Nat\n  ;; Return the number of blocks in the set.\n  (define (blocks-count bs)\n    (length bs))  ;; No duplicates, cardinality = length.\n  \n  ;; blocks-move : Number Number BSet -> BSet\n  ;; Move each block by the given X & Y displacement.\n  (define (blocks-move dx dy bs)\n    (map (λ (b) (block-move dx dy b)) bs))\n  \n  ;; blocks-rotate-ccw : Posn BSet -> BSet\n  ;; Rotate the blocks 90 counterclockwise around the posn.\n  (define (blocks-rotate-ccw c bs)\n    (map (λ (b) (block-rotate-ccw c b)) bs))\n  \n  ;; blocks-rotate-cw : Posn BSet -> BSet\n  ;; Rotate the blocks 90 clockwise around the posn.\n  (define (blocks-rotate-cw c bs)\n    (map (λ (b) (block-rotate-cw c b)) bs))\n  \n  ;; blocks-change-color : BSet Color -> BSet\n  (define (blocks-change-color bs c)\n    (map (λ (b) (block (block-x b) (block-y b) c))\n         bs))\n  \n  ;; blocks-row : BSet Number -> BSet\n  ;; Return the set of blocks in the given row.\n  (define (blocks-row bs i)\n    (filter (λ (b) (= i (block-y b))) bs))\n  \n  ;; full-row? : BSet Nat -> Boolean\n  ;; Are there a full row of blocks at the given row in the set.\n  (define (full-row? bs i)\n    (= board-width (blocks-count (blocks-row bs i))))\n  \n  ;; blocks-overflow? : BSet -> Boolean\n  ;; Have any/c of the blocks reach over the top of the board?\n  (define (blocks-overflow? bs)\n    (ormap (λ (b) (<= (block-y b) 0)) bs))\n  \n  ;; blocks-union : BSet BSet -> BSet\n  ;; Union the two sets of blocks.\n  (define (blocks-union bs1 bs2)\n    (foldr (λ (b bs)\n             (cond [(blocks-contains? bs b) bs]\n                   [else (cons b bs)]))\n           bs2\n           bs1))\n  \n  ;; blocks-max-y : BSet -> Number\n  ;; Compute the maximum y coordinate;\n  ;; if set is empty, return 0, the coord of the board's top edge.\n  (define (blocks-max-y bs)\n    (foldr-n (λ (b n) (max (block-y b) n)) 0 bs))\n  \n  ;; blocks-min-x : BSet -> Number\n  ;; Compute the minimum x coordinate;\n  ;; if set is empty, return the coord of the board's right edge.\n  (define (blocks-min-x bs)\n    (foldr-n (λ (b n) (min (block-x b) n)) board-width bs))\n  \n  ;; blocks-max-x : BSet -> Number\n  ;; Compute the maximum x coordinate;\n  ;; if set is empty, return 0, the coord of the board's left edge.\n  (define (blocks-max-x bs)\n    (foldr-n (λ (b n) (max (block-x b) n)) 0 bs)))\n\n(module elim racket\n  (provide/contract\n   [eliminate-full-rows (BSET/C . -> . BSET/C)])\n  (require (submod \"..\" data) (submod \"..\" bset) (submod \"..\" consts))\n  ;; eliminate-full-rows : BSet -> BSet\n  ;; Eliminate all full rows and shift down appropriately.\n  (define (eliminate-full-rows bs)\n    (elim-row bs board-height 0))\n  \n  (define (elim-row bs i offset)\n    (cond [(< i 0) empty]\n          [(full-row? bs i)   (elim-row bs (sub1 i) (add1 offset))]\n          [else (blocks-union (elim-row bs (sub1 i) offset)\n                              (blocks-move 0 offset (blocks-row bs i)))])))\n\n(module tetras racket\n  (provide/contract ;[tetras (listof TETRA/C)]\n   [tetra-move (integer? integer? TETRA/C . -> . TETRA/C)]\n   [tetra-rotate-ccw (TETRA/C . -> . TETRA/C)]\n   [tetra-rotate-cw (TETRA/C . -> . TETRA/C)]\n   [tetra-overlaps-blocks? (TETRA/C BSET/C . -> . boolean?)]\n   [build-tetra-blocks (COLOR/C number? number? integer? integer? integer? integer? integer? integer? integer? integer?\n                                . -> .  TETRA/C)]\n   [tetra-change-color (TETRA/C COLOR/C . -> . TETRA/C)])\n  (require (submod \"..\" bset) (submod \"..\" data) (submod \"..\" consts) (submod \"..\" block))\n  ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n  ;; Tetras\n  \n  ;; tetra-move : Number Number Tetra -> Tetra\n  ;; Move the Tetra by the given X & Y displacement.\n  (define (tetra-move dx dy t)\n    (tetra (posn (+ dx (posn-x (tetra-center t)))\n                 (+ dy (posn-y (tetra-center t))))\n           (blocks-move dx dy (tetra-blocks t))))\n  \n  ;; tetra-rotate-ccw : Tetra -> Tetra\n  ;; Rotate the tetra 90 degrees counterclockwise around its center.\n  (define (tetra-rotate-ccw t)\n    (tetra (tetra-center t)\n           (blocks-rotate-ccw (tetra-center t)\n                              (tetra-blocks t))))\n  \n  ;; tetra-rotate-cw : Tetra -> Tetra\n  ;; Rotate the tetra 90 degrees clockwise around its center.\n  (define (tetra-rotate-cw t)\n    (tetra (tetra-center t)\n           (blocks-rotate-cw (tetra-center t)\n                             (tetra-blocks t))))\n  \n  ;; tetra-overlaps-blocks? : Tetra BSet -> Boolean\n  ;; Is the tetra on any/c of the blocks?\n  (define (tetra-overlaps-blocks? t bs)\n    (false? (false? (blocks-intersect (tetra-blocks t) bs))))\n  \n  ;; tetra-change-color : Tetra Color -> Tetra\n  ;; Change the color of the given tetra.\n  (define (tetra-change-color t c)\n    (tetra (tetra-center t)\n           (blocks-change-color (tetra-blocks t) c)))\n  \n  (define (build-tetra-blocks color xc yc x1 y1 x2 y2 x3 y3 x4 y4)\n    (tetra-move 3 0 \n                (tetra (posn xc yc)\n                       (list (block x1 y1 color)\n                             (block x2 y2 color)\n                             (block x3 y3 color)\n                             (block x4 y4 color))))))\n\n(module world racket\n  (provide/contract [world-key-move (WORLD/C string? . -> . WORLD/C)]\n           [next-world (WORLD/C . -> . WORLD/C)]\n           [ghost-blocks (WORLD/C . -> . BSET/C)])\n  (require (submod \"..\" data) (submod \"..\" bset) (submod \"..\" block) (submod \"..\" tetras) (submod \"..\" aux) (submod \"..\" elim) (submod \"..\" consts))\n  \n  ;; touchdown : World -> World\n  ;; Add the current tetra's blocks onto the world's block list,\n  ;; and create a new tetra.\n  (define (touchdown w)\n    (world (list-pick-random tetras)\n           (eliminate-full-rows (blocks-union (tetra-blocks (world-tetra w))\n                                              (world-blocks w)))))\n  \n  ;; world-jump-down : World -> World\n  ;; Take the current tetra and move it down until it lands.\n  (define (world-jump-down w)\n    (cond [(landed? w) w]\n          [else (world-jump-down (world (tetra-move 0 1 (world-tetra w))\n                                        (world-blocks w)))]))\n  \n  ;; landed-on-blocks? : World -> Boolean\n  ;; Has the current tetra landed on blocks?\n  ;; I.e., if we move the tetra down 1, will it touch any/c existing blocks?\n  (define (landed-on-blocks? w)\n    (tetra-overlaps-blocks? (tetra-move 0 1 (world-tetra w))\n                            (world-blocks w)))\n  \n  ;; landed-on-floor? : World -> Boolean\n  ;; Has the current tetra landed on the floor?\n  (define (landed-on-floor? w)\n    (= (blocks-max-y (tetra-blocks (world-tetra w)))\n       (sub1 board-height)))\n  \n  ;; landed? : World -> Boolean\n  ;; Has the current tetra landed?\n  (define (landed? w)\n    (or (landed-on-blocks? w)\n        (landed-on-floor? w)))\n  \n  ;; next-world : World -> World\n  ;; Step the world, either touchdown or move the tetra down on step.\n  (define (next-world w)\n    (cond [(landed? w) (touchdown w)]\n          [else (world (tetra-move 0 1 (world-tetra w))\n                       (world-blocks w))]))\n  \n  ;; try-new-tetra : World Tetra -> World\n  ;; Make a world with the new tetra *IF* if doesn't lie on top of some other\n  ;; block or lie off the board. Otherwise, no change.\n  (define (try-new-tetra w new-tetra)\n    (cond [(or (<  (blocks-min-x (tetra-blocks new-tetra)) 0)\n               (>= (blocks-max-x (tetra-blocks new-tetra)) board-width)\n               (tetra-overlaps-blocks? new-tetra (world-blocks w)))\n           w]\n          [else (world new-tetra (world-blocks w))]))\n  \n  ;; world-move : Number Number World -> World\n  ;; Move the Tetra by the given X & Y displacement, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-move dx dy w)\n    (try-new-tetra w (tetra-move dx dy (world-tetra w))))\n  \n  ;; world-rotate-ccw : World -> World\n  ;; Rotate the Tetra 90 degrees counterclockwise, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-rotate-ccw w)\n    (try-new-tetra w (tetra-rotate-ccw (world-tetra w))))\n  \n  ;; world-rotate-cw : World -> World\n  ;; Rotate the Tetra 90 degrees clockwise, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-rotate-cw w)\n    (try-new-tetra w (tetra-rotate-cw (world-tetra w))))\n  \n  ;; ghost-blocks : World -> BSet\n  ;; Gray blocks representing where the current tetra would land.\n  (define (ghost-blocks w)\n    (tetra-blocks (tetra-change-color (world-tetra (world-jump-down w))\n                                      'gray)))\n  \n  ;; world-key-move : World KeyEvent -> World\n  ;; Move the world according to the given key event.\n  (define (world-key-move w k)\n    (cond [(equal? k \"left\") (world-move neg-1 0 w)]\n          [(equal? k \"right\") (world-move 1 0 w)]\n          [(equal? k \"down\") (world-jump-down w)]\n          [(equal? k \"a\") (world-rotate-ccw w)]\n          [(equal? k \"s\") (world-rotate-cw w)]\n          [else w])))\n\n(module image racket\n  (provide/contract\n   [image? (any/c . -> . boolean?)]\n   [overlay (image? image? . -> . image?)]\n   [circle (number? number? string? . -> . image?)]\n   [rectangle (number? number? COLOR/C COLOR/C . -> . image?)]\n   [place-image (image? number? number? image? . -> . image?)]\n   [empty-scene (number? number? . -> . image?)])\n  (require (submod \"..\" data))\n  (struct image (impl)))\n\n(module aux racket\n  (require (submod \"..\" data))\n  (provide/contract\n   [list-pick-random ((listof TETRA/C) . -> . TETRA/C)]\n   [neg-1 integer?] ;; ha!\n   [tetras (listof TETRA/C)]))\n\n(module visual racket\n  (provide/contract\n   [world->image (WORLD/C . -> . image?)]\n   [blocks->image (BSET/C . -> . image?)]\n   [block->image (BLOCK/C . -> . image?)]\n   [place-block (BLOCK/C image? . -> . image?)])\n  (require (submod \"..\" image) (submod \"..\" data) (submod \"..\" consts) (submod \"..\" world) (submod \"..\" list-fun) (submod \"..\" aux))\n  \n  ;; Visualize whirled peas\n  ;; World -> Scene\n  (define (world->image w)\n    (place-image (blocks->image (append (tetra-blocks (world-tetra w))\n                                        (append (ghost-blocks w)\n                                                (world-blocks w))))\n                 0 0 \n                 (empty-scene (* board-width block-size)\n                              (* board-height block-size))))\n  \n  ;; BSet -> Scene\n  (define (blocks->image bs)\n    (foldr-i (λ (b img)\n               (cond [(<= 0 (block-y b)) (place-block b img)]\n                     [else img]))\n             (empty-scene (add1 (* board-width block-size)) \n                          (add1 (* board-height block-size)))\n             bs))\n  \n  ;; Visualizes a block.\n  ;; Block -> Image\n  (define (block->image b)\n    (overlay \n     (rectangle (add1 block-size) (add1 block-size) 'solid (block-color b))\n     (rectangle (add1 block-size) (add1 block-size) 'outline 'black)))\n  \n  ;; Block Scene -> Scene\n  (define (place-block b scene)\n    (place-image (block->image b)\n                 (+ (* (block-x b) block-size) (/ block-size 2))\n                 (+ (* (block-y b) block-size) (/ block-size 2))\n                 scene))\n  \n  (define (world0)\n    (world (list-pick-random tetras) #f)))\n\n(require 'block 'bset 'data 'elim 'tetras 'visual 'image 'world)\n(amb\n (block-rotate-cw • •)\n (block-rotate-ccw • •)\n (block=? • •)\n (block-move • • •)\n (blocks-contains? • •)\n (blocks-subset? • •)\n (blocks=? • •)\n (blocks-count •)\n (blocks-intersect • •)\n (blocks-overflow? •)\n (blocks-move • • •)\n (blocks-rotate-ccw • •)\n (blocks-rotate-cw • •)\n (blocks-change-color • •)\n (full-row? • •)\n (blocks-row • •)\n (blocks-union • •)\n (blocks-max-x •)\n (blocks-max-y •)\n (blocks-min-x •)\n (world-blocks •)\n (world-tetra •)\n (world • •)\n (world? •)\n (tetra • •)\n (tetra-center •)\n (tetra-blocks •)\n (tetra? •)\n (block • • •)\n (block? •)\n (block-color •)\n (block-x •)\n (block-y •)\n (eliminate-full-rows •)\n (tetra-overlaps-blocks? • •)\n (build-tetra-blocks • • • • • • • • • • •) \n (world->image •)\n (blocks->image •)\n (world-key-move • •)\n (next-world •)\n (ghost-blocks •))\n\n"
,
fail_ce_last:"(module Y racket\n  (provide/contract [Y (([any/c . -> . any/c] . -> . [any/c . -> . any/c]) . -> . [any/c . -> . any/c])])\n  (define (Y f)\n    (λ (y)\n      (((λ (x) (f (λ (z) ((x x) z))))\n        (λ (x) (f (λ (z) ((x x) z)))))\n       y))))\n\n(module last racket\n  (require (submod \"..\" Y))\n  (provide/contract [last (#|HERE|#(listof any/c) . -> . any/c)])\n  (define (last l)\n    ((Y (λ (f)\n          (λ (x)\n            (if (empty? (cdr x)) (car x) (f (cdr x))))))\n     l)))\n\n(require 'last)\n(last •)\n\n"
,
fail_ce_mem:"(module mem racket\n  (provide/contract\n   [mk-list (->i ([_ integer?] [x integer?])\n\t\t (res (_ x)\n\t\t      (and/c (listof integer?)\n\t\t\t     (λ (l) (or (empty? l) (mem x l))))))]\n   [mem (integer? (listof integer?) . -> . boolean?)])\n  (define (mk-list n x)\n    (if (< n 0) empty (cons #|HERE|#n #;x (mk-list (- n 1) x))))\n  (define (mem x xs)\n    (if (empty? xs) #f (or (= x (car xs)) (mem x (cdr xs))))))\n\n(require 'mem)\n(mk-list • •)\n\n"
,
fail_ce_foldl1:"(module foldl1 racket\n  (provide/contract [foldl1 ((any/c any/c . -> . any/c) (#|HERE|# listof any/c) . -> . any/c)])\n  (define (foldl1 f xs)\n    (let ([z (car xs)]\n          [zs (cdr xs)])\n      (if (empty? zs) z\n          (foldl1 f (cons (f z (car zs)) (cdr zs)))))))\n\n(require 'foldl1)\n(foldl1 • •)\n\n"
,
fail_ce_last_pair:"(module lastpair racket\n  (provide/contract\n   [lastpair (cons? . -> . cons?)])\n  (define (lastpair x)\n    (if (cons? #|HERE|# x) (lastpair (cdr x)) x)))\n\n(require 'lastpair)\n(lastpair (cons • •))\n\n"
,
fail_ce_fold_div:"(module rand racket (provide/contract (rand (-> integer?))))\n\n(module fold-div racket\n  (provide/contract\n   [foldl ((real? real? . -> . real?) real? (listof real?) . -> . real?)]\n   [randpos (-> integer?)]\n   [mk-list (integer? . -> . (listof (and/c integer? positive?)))]\n   [main (integer? integer? . -> . real?)])\n  (require (submod \"..\" rand))\n  (define (foldl f z l)\n    (if (empty? l) z (foldl f (f z (car l)) (cdr l))))\n  (define (randpos)\n    (let ([n (rand)]) (if (#|HERE >|# >= n 0) n (randpos))))\n  (define (mk-list n)\n    (if (<= n 0) empty\n        (cons (randpos) (mk-list (- n 1)))))\n  (define (main n m) (foldl / m (mk-list n))))\n\n(require 'fold-div)\n(main • •)\n\n"
,
fail_ce_argmin:"(module holes racket\n  (provide/contract [proc (-> any/c number?)]\n\t   [lst (nelistof any/c)]))\n\n(module min racket\n  (provide/contract [min (real? real? . -> . real?)])\n  (define (min x y)\n    (if (< x y) x y)))\n\n(module argmin racket\n  (provide/contract [argmin ((-> any/c number?) (nelistof any/c) . -> . any/c)])\n  (require (submod \"..\" min))\n  (define (argmin f xs)\n    (cond [(empty? (cdr xs)) (f (car xs))]\n\t  [else (min (f (car xs))\n\t\t     (argmin f (cdr xs)))])))\n\n(require 'holes 'argmin)\n(argmin proc lst)\n\n"
,
fail_ce_member:"(module member racket\n  (provide/contract\n   [member (any/c (listof any/c) . -> . #|HERE|# boolean?)])\n  (define (member x l)\n    (cond\n     [(empty? l) empty]\n     [(equal? x (car l)) l]\n     [else (member x (cdr l))])))\n\n(require 'member)\n(member • •)\n\n"
,
fail_ce_snake:"(module image racket\n  (provide/contract\n   [image/c any/c]\n   [circle (number? string? string? . -> . image/c)]\n   [empty-scene (number? number? . -> . image/c)]\n   [place-image (image/c number? number? image/c . -> . image/c)])\n  (define image/c (λ (x) (image? x)))\n  (define (image? x) •))\n\n(module data racket\n  (provide/contract\n   [struct posn ([x number?] [y number?])]\n   [posn=? (POSN/C POSN/C . -> . boolean?)]\n   [struct snake ([dir DIR/C] [segs (nelistof POSN/C)])]\n   [struct world ([snake SNAKE/C] [food POSN/C])]\n   [DIR/C any/c]\n   [POSN/C any/c]\n   [SNAKE/C any/c]\n   [WORLD/C any/c])\n  \n  (define DIR/C (one-of/c \"up\" \"down\" \"left\" \"right\"))\n  (define POSN/C (struct/c posn number? number?))\n  (define SNAKE/C (struct/c snake DIR/C (nelistof POSN/C)))\n  (define WORLD/C (struct/c world SNAKE/C POSN/C))\n  \n  (struct posn (x y))\n  (define (posn=? p1 p2)\n    (and (= (posn-x p1) (posn-x p2))\n         (= (posn-y p1) (posn-y p2))))\n  \n  (struct snake (dir segs))\n  (struct world (snake food)))\n\n(module const racket\n  (provide/contract\n   [WORLD (-> WORLD/C)]\n   [BACKGROUND (-> image/c)]\n   [FOOD-IMAGE (-> image/c)]\n   [SEGMENT-IMAGE (-> image/c)]\n   [GRID-SIZE number?]\n   [BOARD-HEIGHT-PIXELS (-> number?)]\n   [BOARD-WIDTH number?]\n   [BOARD-HEIGHT number?])\n  (require (submod \"..\" image) (submod \"..\" data))\n  \n  (define GRID-SIZE 30)\n  (define BOARD-HEIGHT 20)\n  (define BOARD-WIDTH 30)\n  (define (BOARD-HEIGHT-PIXELS) (* GRID-SIZE BOARD-HEIGHT))\n  (define (BOARD-WIDTH-PIXELS) (* GRID-SIZE BOARD-WIDTH))\n  (define (BACKGROUND) (empty-scene (BOARD-WIDTH-PIXELS) (BOARD-HEIGHT-PIXELS)))\n  (define (SEGMENT-RADIUS) (/ GRID-SIZE 2))\n  (define (SEGMENT-IMAGE)  (circle (SEGMENT-RADIUS) \"solid\" \"red\"))\n  (define (FOOD-RADIUS) (SEGMENT-RADIUS))\n  (define (FOOD-IMAGE)  (circle (FOOD-RADIUS) \"solid\" \"green\"))\n  (define (WORLD) (world (snake \"right\" (cons (posn 5 3) empty))\n                         (posn 8 12))))\n\n(module collide racket\n  (provide/contract\n   [snake-wall-collide? (SNAKE/C . -> . boolean?)]\n   [snake-self-collide? (SNAKE/C . -> . boolean?)])\n  (require (submod \"..\" data) (submod \"..\" const))\n  \n  ;; snake-wall-collide? : Snake -> Boolean\n  ;; Is the snake colliding with any/c of the walls?\n  (define (snake-wall-collide? snk)\n    (head-collide? (car (snake-segs snk))))\n  \n  ;; head-collide? : Posn -> Boolean\n  (define (head-collide? p)\n    (or (<= (posn-x p) 0)\n        (>= (posn-x p) BOARD-WIDTH)\n        (<= (posn-y p) 0)\n        (>= (posn-y p) BOARD-HEIGHT)))\n  \n  ;; snake-self-collide? : Snake -> Boolean\n  (define (snake-self-collide? snk)\n    (segs-self-collide? (car (snake-segs snk))\n                        (cdr (snake-segs snk))))\n  \n  ;; segs-self-collide? : Posn Segs -> Boolean\n  (define (segs-self-collide? h segs)\n    (cond [(empty? segs) #f]\n          [else (or (posn=? (car segs) h)\n                    (segs-self-collide? h (cdr segs)))])))\n\n(module cut-tail racket\n  (provide/contract\n   [cut-tail ((nelistof POSN/C) . -> . (listof POSN/C))])\n  (require (submod \"..\" data))\n  ;; NeSegs is one of:\n  ;; - (cons Posn empty)\n  ;; - (cons Posn NeSegs)\n  \n  ;; cut-tail : NeSegs -> Segs\n  ;; Cut off the tail.\n  (define (cut-tail segs)\n    (let ([r (cdr segs)])\n      (cond [(empty? r) empty]\n            [else (cons (car segs) (cut-tail r))]))))\n\n(module motion-help racket\n  (provide/contract\n   [snake-slither (SNAKE/C . -> . SNAKE/C)]\n   [snake-grow (SNAKE/C . -> . SNAKE/C)])\n  (require (submod \"..\" data) (submod \"..\" cut-tail))\n  \n  ;; next-head : Posn Direction -> Posn\n  ;; Compute next position for head.\n  (define (next-head seg dir)\n    (cond [(equal? \"right\" dir) (posn (add1 (posn-x seg)) (posn-y seg))]\n          [(equal? \"left\" dir)  (posn (sub1 (posn-x seg)) (posn-y seg))]\n          [(equal? \"down\" dir)  (posn (posn-x seg) (sub1 (posn-y seg)))]\n          [else                 (posn (posn-x seg) (add1 (posn-y seg)))]))\n  \n  ;; snake-slither : Snake -> Snake\n  ;; move the snake one step\n  (define (snake-slither snk)\n    (let ([d (snake-dir snk)])\n      (snake d\n             (cons (next-head (car (snake-segs snk))\n                              d)\n                   (cut-tail (snake-segs snk))))))\n  \n  ;; snake-grow : Snake -> Snake\n  ;; Grow the snake one segment.\n  (define (snake-grow snk)\n    (let ([d (snake-dir snk)])\n      (snake d\n             (cons (next-head (car (snake-segs snk))\n                              d)\n                   (snake-segs snk))))))\n\n(module motion racket\n  (provide/contract\n   [world-change-dir (WORLD/C DIR/C . -> . WORLD/C)]\n   [world->world (WORLD/C . -> . WORLD/C)])\n  (require (submod \"..\" data) (submod \"..\" const) (submod \"..\" motion-help))\n  ;; world->world : World -> World\n  (define (world->world w)\n    (cond [(eating? w) (snake-eat w)]\n          [else\n           (world (snake-slither (world-snake w))\n                  (world-food w))]))\n  ;; eating? : World -> Boolean\n  ;; Is the snake eating the food in the world.\n  (define (eating? w)\n    (posn=? (world-food w)\n            (car (snake-segs (world-snake w)))))\n  ;; snake-change-direction : Snake Direction -> Snake\n  ;; Change the direction of the snake.\n  (define (snake-change-direction snk dir)\n    (snake dir\n           (snake-segs snk)))\n  ;; world-change-dir : World Direction -> World\n  ;; Change direction of the world.\n  (define (world-change-dir w dir)\n    (world (snake-change-direction (world-snake w) dir)\n           (world-food w)))\n  ;; snake-eat : World -> World\n  ;; Eat the food and generate a new one.\n  (define (snake-eat w)\n    (world (snake-grow (world-snake w))\n           #;(posn (random BOARD-WIDTH) (random BOARD-HEIGHT))\n           (posn (- BOARD-WIDTH 1) (- BOARD-HEIGHT 1)))))\n\n(module handlers racket\n  ;; Movie handlers\n  ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n  (provide/contract\n   [handle-key (WORLD/C string? . -> . WORLD/C)]\n   [game-over? (WORLD/C . -> . boolean?)])\n  (require (submod \"..\" data) (submod \"..\" motion) (submod \"..\" collide))\n  \n  ;; handle-key : World String -> World\n  (define (handle-key w ke)\n    (cond [(equal? ke \"w\") (world-change-dir w \"up\")]\n          [(equal? ke \"s\") (world-change-dir w \"down\")]\n          [(equal? ke \"a\") (world-change-dir w \"left\")]\n          [(equal? ke \"d\") (world-change-dir w \"right\")]\n          [else w]))\n  \n  ;; game-over? : World -> Boolean\n  (define (game-over? w)\n    (or (snake-wall-collide? (world-snake w))\n        (snake-self-collide? (world-snake w)))))\n(module scenes racket\n  \n  (provide/contract\n   [world->scene (WORLD/C . -> . image/c)]\n   [food+scene (POSN/C image/c . -> . image/c)]\n   [place-image-on-grid (image/c number? number? image/c . -> . image/c)]\n   [snake+scene (SNAKE/C image/c . -> . image/c)]\n   [segments+scene ((listof POSN/C) image/c . -> . image/c)]\n   [segment+scene (POSN/C image/c . -> . image/c)])\n  (require (submod \"..\" data) (submod \"..\" const) (submod \"..\" image))\n  \n  ;; world->scene : World -> Image\n  ;; Build an image of the given world.\n  (define (world->scene w)\n    (snake+scene (world-snake w)\n                 (food+scene (world-food w) (BACKGROUND))))\n  \n  ;; food+scene : Food Image -> Image\n  ;; Add image of food to the given scene.\n  (define (food+scene f scn)\n    (place-image-on-grid (FOOD-IMAGE) (posn-x f) (posn-y f) scn))\n  \n  ;; place-image-on-grid : Image Number Number Image -> Image\n  ;; Just like PLACE-IMAGE, but use grid coordinates.\n  (define (place-image-on-grid img x y scn)\n    (place-image img\n                 (* GRID-SIZE x)\n                 (- (BOARD-HEIGHT-PIXELS) (* GRID-SIZE y))\n                 scn))\n  \n  ;; snake+scene : Snake Image -> Image\n  ;; Add an image of the snake to the scene.\n  (define (snake+scene snk scn)\n    (segments+scene (snake-segs snk) scn))\n  \n  ;; segments+scene : Segs Image -> Image\n  ;; Add an image of the snake segments to the scene.\n  (define (segments+scene segs scn)\n    (cond [(empty? segs) scn]\n          [else (segments+scene (cdr segs) ;; tail recursion\n                                (segment+scene (car segs) scn))]))\n  \n  ;; segment+scene : Posn Image -> Image\n  ;; Add one snake segment to a scene.\n  (define (segment+scene seg scn)\n    (place-image-on-grid (SEGMENT-IMAGE) (posn-x seg) (posn-y seg) scn)))\n\n(require 'image 'data 'const 'collide 'cut-tail 'motion-help 'motion 'handlers 'scenes)\n(amb\n (snake-wall-collide? •)\n (snake-self-collide? •)\n (WORLD)\n (BACKGROUND)\n (FOOD-IMAGE)\n (SEGMENT-IMAGE)\n GRID-SIZE\n (BOARD-HEIGHT-PIXELS)\n BOARD-WIDTH\n BOARD-HEIGHT\n (cut-tail •)\n (posn • •)\n (posn? •)\n (posn-x •)\n (posn-y •)\n (posn=? • •)\n (snake • •)\n (snake? •)\n (snake-dir •)\n (snake-segs •)\n (world • •)\n (world? •)\n (world-snake •)\n (world-food •)\n (game-over? •)\n (handle-key • •)\n (snake-slither •)\n (snake-grow •)\n (world->world •)\n (world-change-dir • •)\n (world->scene •)\n (food+scene • •)\n (place-image-on-grid • • • •)\n (snake+scene • •)\n (segments+scene • •)\n (segment+scene • •))\n\n"
,
fail_ce_all:"(module all racket\n  (provide/contract [all ((any/c . -> . any/c) (listof any/c) . -> . #|HERE|#boolean?)])\n  (define (all p? xs)\n    (cond\n      [(empty? xs) #t]\n      [(empty? (cdr xs)) (p? (car xs))]\n      [else (and (p? (car xs)) (all p? (cdr xs)))])))\n\n(require 'all)\n(all • •)\n\n"
,
fail_ce_foldl:"(module foldl racket\n  (provide/contract\n   [foldl ((number? boolean? . -> . boolean?) boolean? (listof number?) . -> . boolean?)])\n  (define (foldl f z xs)\n    (if (empty? xs) z\n        (foldl f (f #|HERE|# z (car xs)) (cdr xs)))))\n\n(require 'foldl)\n(foldl • • •)\n\n"
,
fail_ce_ack:"(module ack racket ; weakening the 1st arg will make program loop (never wrong)\n  (provide/contract [ack (integer? #|HERE|#real? . -> . integer?)])\n  (define (ack m n)\n    (cond\n      [(= m 0) (+ n 1)]\n      [(= n 0) (ack (- m 1) 1)]\n      [else (ack (- m 1) (ack m (- n 1)))])))\n\n(require 'ack)\n(ack • •)\n\n"
,
fail_ce_id_dependent:"(module id racket\n  (provide/contract\n   [f (->i ([x number?]) (res (x) (=/c x)))])\n  (define (f x) x))\n\n(require 'opaque 'id)\n(f •)\n\n"
,
fail_ce_zombie:"(module image racket\n  (provide/contract\n   [image? (any/c . -> . boolean?)]\n   [empty-scene (number? number? . -> . image?)]\n   [place-image (image? number? number? image? . -> . image?)]\n   [circle (number? string? string? . -> . image?)])\n  (struct image (impl)))\n\n(module math racket\n  (provide/contract\n   [min (number? number? . -> . number?)]\n   [max (number? number? . -> . number?)]\n   [abs (number? . -> . number?)]\n   [sqrt (number? . -> . number?)]\n   [sqr (number? . -> . number?)])\n  (define (min x y) (if (<= x y) x y))\n  (define (max x y) (if (>= x y) x y))\n  (define (abs x) (if (>= x 0) x (- 0 x)))\n  (define (sqr x) (* x x)))\n\n(module zombie racket\n  (provide/contract\n   [posn/c any/c]\n   [player/c any/c]\n   [zombie/c any/c]\n   [zombies/c any/c]\n   [horde/c any/c]\n   [world/c any/c]\n   \n   [new-world (player/c posn/c horde/c . -> . world/c)]\n   [new-player (posn/c . -> . player/c)]\n   [new-horde (zombies/c zombies/c . -> . horde/c)]\n   [new-cons-zombies (zombie/c zombies/c . -> . zombies/c)]\n   [new-mt-zombies (-> zombies/c)]\n   [new-zombie (posn/c . -> . zombie/c)]\n   [new-posn (number? number? . -> . posn/c)]\n   [w0 world/c])\n  (require (submod \"..\" image) (submod \"..\" math))\n  \n  (define WIDTH 400)\n  (define HEIGHT 400)\n  (define MT-SCENE (empty-scene WIDTH HEIGHT))\n  (define PLAYER-SPEED 4)\n  (define ZOMBIE-SPEED 2)\n  (define ZOMBIE-RADIUS 20)\n  (define PLAYER-RADIUS 20)\n  (define PLAYER-IMG (circle PLAYER-RADIUS \"solid\" \"green\"))\n  \n  (define posn/c\n    (->i ([msg (one-of/c 'x 'y 'posn 'move-toward/speed 'draw-on/image 'dist)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'x) (-> number?)]\n\t       [(equal? msg 'y) (-> number?)]\n\t       [(equal? msg 'posn) (-> posn/c)]\n\t       [(equal? msg 'move-toward/speed) (posn/c number? . -> . posn/c)]\n\t       [(equal? msg 'draw-on/image) (image? image? . -> . image?)]\n\t       [(equal? msg 'dist) (posn/c . -> . number?)]\n\t       [else \"error\"]))))\n  \n  (define player/c\n    (->i ([msg (one-of/c 'posn 'move-toward 'draw-on)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'posn) (-> posn/c)]\n\t       [(equal? msg 'move-toward) (posn/c . -> . player/c)]\n\t       [(equal? msg 'draw-on) (image? . -> . image?)]\n\t       [else \"error\"]))))\n  \n  (define zombie/c\n    (->i ([msg (one-of/c 'posn 'draw-on/color 'touching? 'move-toward)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'posn) (-> posn/c)]\n\t       [(equal? msg 'draw-on/color) (string? image? . -> . image?)]\n\t       [(equal? msg 'touching?) (posn/c . -> . boolean?)]\n\t       [(equal? msg 'move-toward) (posn/c . -> . zombie/c)]\n\t       [else \"error\"]))))\n  \n  (define horde/c\n    (->i ([msg (one-of/c 'dead 'undead 'draw-on 'touching? 'move-toward 'eat-brains)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'dead) (-> zombies/c)]\n\t       [(equal? msg 'undead) (-> zombies/c)]\n\t       [(equal? msg 'draw-on) (image? . -> . image?)]\n\t       [(equal? msg 'touching?) (posn/c . -> . boolean?)]\n\t       [(equal? msg 'move-toward) (posn/c . -> . horde/c)]\n\t       [(equal? msg 'eat-brains) (-> horde/c)]\n\t       [else \"error\"]))))\n  \n  (define zombies/c\n    (->i ([msg (one-of/c 'move-toward 'draw-on/color 'touching? 'kill-all)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'move-toward) (posn/c . -> . zombies/c)]\n\t       [(equal? msg 'draw-on/color) (string? image? . -> . image?)]\n\t       [(equal? msg 'touching?) (posn/c . -> . boolean?)]\n\t       [(equal? msg 'kill-all) (zombies/c . -> . horde/c)]\n\t       [else \"error\"]))))\n  \n  (define world/c\n    (->i ([msg (one-of/c 'on-mouse 'on-tick 'to-draw 'stop-when)])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg 'on-mouse) (number? number? string? . -> . world/c)]\n\t       [(equal? msg 'on-tick) (-> world/c)]\n\t       [(equal? msg 'to-draw) (-> image?)]\n\t       [(equal? msg 'stop-when) (-> boolean?)]\n\t       [else \"error\"]))))\n  \n  (define (new-world player mouse zombies)\n    (λ (msg)\n      (cond\n        [(equal? msg 'on-mouse)\n         (λ (x y me)\n           (new-world player\n                      (if (equal? me \"leave\") ((player 'posn)) (new-posn x y))\n                      zombies))]\n        [(equal? msg 'on-tick)\n         (λ ()\n           (new-world ((player 'move-toward) mouse)\n                      mouse\n                      ((((zombies 'eat-brains)) 'move-toward) ((player 'posn)))))]\n        [(equal? msg 'to-draw)\n         (λ ()\n           ((player 'draw-on) ((zombies 'draw-on) MT-SCENE)))]\n        [(equal? msg 'stop-when)\n         (λ ()\n           ((zombies 'touching?) ((player 'posn))))]\n        [else \"unknown message\"])))\n  \n  (define (new-player p)\n    (λ (msg)\n      (cond\n        [(equal? msg 'posn) (λ () p)]\n        [(equal? msg 'move-toward)\n         (λ (q)\n           (new-player ((p 'move-toward/speed) q PLAYER-SPEED)))]\n        [(equal? msg 'draw-on)\n         (λ (scn)\n           ((p 'draw-on/image) PLAYER-IMG scn))]\n        [else \"unknown message\"])))\n  \n  (define (new-horde undead dead)\n    (λ (msg)\n      (cond\n        [(equal? msg 'dead) (λ () dead)]\n        [(equal? msg 'undead) (λ () undead)]\n        [(equal? msg 'draw-on)\n         (λ (scn)\n           ((undead 'draw-on/color) \"yellow\" ((dead 'draw-on/color) \"black\" scn)))]\n        [(equal? msg 'touching?)\n         (λ (p)\n           (or ((undead 'touching?) p) ((dead 'touching?) p)))]\n        [(equal? msg 'move-toward)\n         (λ (p)\n           (new-horde ((undead 'move-toward) p) dead))]\n        [(equal? msg 'eat-brains) (λ () ((undead 'kill-all) dead))]\n        [else \"unknown message\"])))\n  \n  (define (new-cons-zombies z r)\n    (λ (msg)\n      (cond\n        [(equal? msg 'move-toward)\n         (λ (p)\n           (new-cons-zombies ((z 'move-toward) p) ((r 'move-toward) p)))]\n        [(equal? msg 'draw-on/color)\n         (λ (c s)\n           ((z 'draw-on/color) c ((r 'draw-on/color) c s)))]\n        [(equal? msg 'touching?)\n         (λ (p)\n           (or ((z 'touching?) p) ((r 'touching?) p)))]\n        [(equal? msg 'kill-all)\n         (λ (dead)\n           (cond\n             [(or ((r 'touching?) ((z 'posn)))\n                  ((dead 'touching?) ((z 'posn))))\n              ((r 'kill-all) (new-cons-zombies z dead))]\n             [else (let ([res ((r 'kill-all) dead)])\n                     (new-horde\n                      (new-cons-zombies z ((res 'undead)))\n                      ((res 'dead))))]))]\n        [else \"unknown message\"])))\n  \n  (define (new-mt-zombies)\n    (λ (msg)\n      (cond\n        [(equal? msg 'move-toward) (λ (p) (new-mt-zombies))]\n        [(equal? msg 'draw-on/color) (λ (c s) s)]\n        [(equal? msg 'touching?) (λ (p) #f)]\n        [(equal? msg 'kill-all)\n         (λ (dead)\n           (new-horde (new-mt-zombies) dead))]\n        [else \"unknown message\"])))\n  \n  (define (new-zombie p)\n    (λ (msg)\n      (cond\n        [(equal? msg 'posn) (λ () p)]\n        [(equal? msg 'draw-on/color)\n         (λ (c s)\n           ((p 'draw-on/image)\n            (circle ZOMBIE-RADIUS \"solid\" c)\n            s))]\n        [(equal? msg 'touching?)\n         (λ (q)\n           (<= ((p 'dist) q) ZOMBIE-RADIUS))]\n        [(equal? msg 'move-toward)\n         (λ (q)\n           (new-zombie ((p 'move-toward/speed) q ZOMBIE-SPEED)))]\n        [else \"unknown message\"])))\n  \n  (define (new-posn x y)\n    (λ (msg)\n      (let ([this (new-posn x y)]) ; FIXME\n        (cond\n          [(equal? msg 'x) (λ () x)]\n          [(equal? msg 'y) (λ () y)]\n          [(equal? msg 'posn) (λ () this)]\n          [(equal? msg 'move-toward/speed)\n           (λ (p speed)\n             (let* ([δx (- ((p 'x)) x)]\n                    [δy (- ((p 'y)) y)]\n                    [move-distance (min speed (max (abs δx) (abs δy)))])\n               (cond\n                 [(< (abs δx) (abs δy))\n                  ((this 'move)\n                   0\n                   (if (positive? δy) move-distance (- 0 move-distance)))]\n                 [else\n                  ((this 'move)\n                   (if (positive? δx) move-distance (- 0 move-distance))\n                   0)])))]\n          [(equal? msg 'move)\n           (λ (δx δy)\n             (new-posn (+ x δx) (+ y δy)))]\n          [(equal? msg 'draw-on/image)\n           (λ (img scn)\n             (place-image img x y scn))]\n          [(equal? msg 'dist)\n           (λ (p)\n             (sqrt (+ (sqr (- ((p 'y)) y))\n                      (sqr (- ((p 'x)) x)))))]\n          [else \"unknown message\"]))))\n  \n  (define w0\n    (new-world\n     (new-player (new-posn 0 0))\n     (new-posn 0 0)\n     (new-horde\n      (new-cons-zombies\n       (new-zombie (new-posn 100 300))\n       (new-cons-zombies\n        (new-zombie (new-posn 100 200))\n        (new-mt-zombies)))\n      (new-cons-zombies\n       (new-zombie (new-posn 200 200))\n       (new-mt-zombies))))))\n\n(require 'zombie)\n\n(amb (• new-posn)\n     (• new-player)\n     (• new-zombie)\n     (• new-cons-zombies)\n     (• new-mt-zombies)\n     (• new-horde)\n     (• new-world))\n\n"
,
fail_ce_foldr1:"(module foldr1 racket\n  (provide/contract [foldr1 ((any/c any/c . -> . any/c) (#|HERE|#listof any/c) . -> . any/c)])\n  (define (foldr1 f xs)\n    (let ([z (car xs)]\n          [zs (cdr xs)])\n      (if (empty? zs) z\n          (f z (foldr1 f zs))))))\n\n(require 'foldr1)\n(foldr1 • •)\n\n"
,
fail_ce_sum:"(module sum racket\n  (provide/contract\n   [sum (->i ([n integer?])\n\t     (res (n) (and/c integer? (#|HERE|# >/c n))))])\n  (define (sum n)\n    (if (<= n 0) 0\n        (+ n (sum (- n 1))))))\n\n(require 'sum)\n(sum •)\n\n"
,
fail_ce_get_path:"(module lib racket\n  (provide/contract\n   [path/c any/c]\n   [dom/c any/c])\n  (define path/c\n    (->i ([msg (one-of/c \"hd\" \"tl\")])\n\t (res (msg) (cond [(equal? msg \"hd\") string?]\n\t\t\t  [else (or/c false? path/c)]))))\n  (define dom/c\n    (->i ([msg (one-of/c \"get-child\")])\n\t (res (msg) (string? . -> . dom/c)))))\n\n(module get-path racket\n  (provide/contract [get-path (dom/c path/c . -> . dom/c)])\n  (require (submod \"..\" lib))\n  (define (get-path root p)\n    (while root p))\n  (define (while cur path)\n    (if (and (not (false? path)) (not (false? cur)))\n        (while ((cur \"get-child\") (path \"hd\"))\n          (path #|HERE|# \"hd\" #;\"tl\"))\n        cur)))\n\n(require 'get-path)\n(get-path • •)\n\n"
,
fail_ce_l_zipunzip:"(module l-zipunzip racket\n  (provide/contract\n   [f ((integer? integer? . -> . integer?) . -> . (integer? integer? . -> . integer?))]\n   [unzip (integer? (integer? integer? . -> . integer?) . -> . integer?)]\n   [zip (integer? integer? . -> . integer?)]\n   [main (integer? . -> . integer?)])\n  \n  (define (f g) (λ (x y) (g (+ x 1) (+ y 1))))\n  (define (unzip x k)\n    (if (= x 0) (k 0 0)\n        (unzip (- x 1) (f k))))\n  (define (zip x y)\n    (if (= x 0)\n        (if (= y 0) 0 'fail)\n        (if (= y 0) 'fail\n            (+ 1 (zip (- x 1) (- y 1))))))\n  (define (main n)\n    (unzip n zip)))\n\n(require 'l-zipunzip)\n(main •)\n\n"
,
fail_ce_braun_tree:"(module tree racket\n  (provide/contract\n   [braun-tree? (any/c . -> . boolean?)]\n   [insert (braun-tree? any/c . -> . braun-tree?)])\n  \n  (struct node (v l r))\n\n  (define (braun-tree? x)\n    (or (false? x)\n\t(and (node? x)\n\t     (braun-tree? (node-l x))\n\t     (braun-tree? (node-r x))\n\t     (let ([l (size (node-l x))]\n\t\t   [r (size (node-r x))])\n\t       (or (= l r) (= l (add1 r)))))))\n  \n  (define (size x)\n    (if (node? x)\n        (add1 (+ (size (node-l x)) (size (node-r x))))\n        0))\n  \n  (define (insert bt x)\n    (if (node? bt)\n        (node (node-v bt) (insert (#|HERE|#node-l bt) x) (node-r bt))\n        (node x #f #f))))\n\n(require 'tree)\n(insert • 42)\n\n\n"
,
fail_ce_append:"(module append racket\n  (provide/contract\n   [append ((listof any/c) (listof any/c) . -> . #|HERE|# cons?)])\n  (define (append xs ys)\n    (if (empty? xs) ys\n        (cons (car xs) (append (cdr xs) ys)))))\n\n(require 'append)\n(append • •)\n\n"
,
fail_ce_inc_or_greet:"(module lib racket\n  (provide/contract [string-append (string? string? . -> . string?)]))\n\n(module inc-or-greet racket\n  (provide/contract [inc-or-greet (boolean? (or/c string? integer?) . -> . (or/c #|HERE|# #;false? integer? string?))])\n  (require (submod \"..\" lib))\n  (define (inc-or-greet mode y)\n    (if mode\n        (if (integer? y) (+ y 1) #f)\n        (if (string? y) (string-append \"Hello\" y) #f))))\n\n(require 'inc-or-greet)\n(inc-or-greet • •)\n\n"
,
fail_ce_l_zipmap:"(module zip racket\n  (provide/contract [zip (integer? integer? . -> . integer?)])\n  (define (zip x y)\n    (cond\n      [(and (= x 0) (= y 0)) x]\n      [(and (not (= x 0)) (not (= y 0))) (+ 1 (zip (- x 1) (- y 1)))]\n      [else 'fail])))\n\n(module map racket\n  (provide/contract [map (integer? . -> . integer?)])\n  (define (map x)\n    (if (= x 0) x (+ 1 (map (- x 1))))))\n\n(module main racket\n  (provide/contract [main (->i ([n integer?])\n\t\t      (res (n) (and/c integer? (=/c n))))])\n  (require (submod \"..\" zip) (submod \"..\" map))\n  (define (main n) (map (zip n n))))\n\n(require 'main)\n(main •)\n\n"
,
safe_recursive_div2:"(module recursive-div2 racket\n  (provide/contract\n   [recursive-div2 ((μ/c (X) (or/c empty? (cons/c any/c (cons/c any/c X))))\n                    . -> . (listof any/c))])\n  (define (recursive-div2 l)\n    (if (empty? l) empty\n        (cons (car l) (recursive-div2 (cdr (cdr l)))))))\n\n(require 'recursive-div2)\n(recursive-div2 •)\n\n"
,
safe_length_acc:"(module len racket\n  (provide/contract\n   [len (->i ([l (listof any/c)]) (res (l) (and/c integer? (>=/c 0))))])\n  (define (len xs)\n    (len-acc xs 0))\n  (define (len-acc xs acc)\n    (if (empty? xs) acc\n        (len-acc (cdr xs) (+ 1 acc)))))\n\n(require 'len)\n(len •)\n\n"
,
safe_recip:"(module recip racket\n  (provide/contract [recip (any/c . -> . (or/c (and/c number? (not/c zero?)) string?))])\n  (define (recip x)\n    (if (and (number? x) (not (zero? x)))\n        (/ 1 x)\n        \"expect non-zero number\")))\n\n(require 'recip)\n(recip •)\n\n"
,
safe_ex_11:"(module f racket\n  (provide/contract [f (cons? . -> . symbol?)])\n  (require (submod \"..\" g))\n  (define (f p)\n    (if (and (number? (car p)) (number? (cdr p))) (g p) 'no)))\n\n(module g racket\n  (provide/contract [g ((cons/c number? number?) . -> . symbol?)]))\n\n(require 'f)\n(f •)\n\n"
,
safe_sum_filter:"(module filter racket ; opaque\n  (provide/contract [filter (->i ([p? (any/c . -> . any/c)] [_ (listof any/c)])\n\t\t\t\t (res (p? _) (listof (λ (y) (p? y)))))]))\n\n(module add-nums racket\n  (provide/contract [add-nums ((listof any/c) . -> . number?)])\n  (require (submod \"..\" filter))\n  \n  (define (add-nums xs)\n    (foldl + 0 (filter number? xs)))\n  \n  (define (foldl f z xs)\n    (if (empty? xs) z (foldl f (f (car xs) z) (cdr xs)))))\n\n(require 'add-nums)\n(add-nums •)\n\n"
,
safe_filter:"(module filter racket\n  (provide/contract\n   [filter ((any/c . -> . any/c) (listof any/c) . -> . (listof any/c))])\n  (define (filter p? xs)\n    (cond\n      [(empty? xs) empty]\n      [else (let ([x (car xs)]\n                  [zs (filter p? (cdr xs))])\n              (if (p? x) (cons x zs) zs))])))\n\n(require 'filter)\n(filter • •)\n\n"
,
safe_dvh_3:"(module dvh-3 racket\n  (provide/contract\n   [  eq  (->i ([x real?]) (res (x) (=/c x)))]\n   [succ  (->i ([x real?]) (res (x) (=/c (add1 x))))]\n   [succ2 (->i ([x real?]) (res (x) (lambda (z) (= x (sub1 z)))))]\n   [mult  (->i ([x real?] [y real?]) (res (x y) (=/c (* x y))))]\n   ;; reverse order of mult in contract from implementation\n   [mult2 (->i ([x real?] [y real?]) (res (x y) (=/c (* y x))))])\n\n  (define (eq x) x)\n  (define (succ x) (add1 x))\n  (define (succ2 x) (add1 x))\n  (define (mult x y) (* x y))\n  (define (mult2 x y) (* x y)))\n\n(require 'dvh-3)\n(begin\n (eq •)\n (succ •)\n (succ2 •)\n\n (mult • •)  ;; BUG: these two expressions produce blame that is identified\n (mult2 • •) ;; so there's only one error report for the pair\n )\n\n"
,
safe_ex_06:"(module f racket\n  (provide/contract [f ((or/c number? string?) string? . -> . number?)])\n  (define (f x y)\n    (if (and (number? x) (string? y))\n        (+ x (string-length y))\n        (string-length x))))\n\n(require 'f)\n(f • •)\n\n"
,
safe_terauchi_mult:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (mult x y)\n    (if (or (<= x 0) (<= y 0)) 0\n        (+ x (mult x (- y 1)))))\n  (define (main) (assert (<= 100 (mult 100 100)))))\n\n(require 'm)\n(main)\n\n"
,
safe_incf:"(module obj racket\n  (provide/contract\n   [alloc (-> (none/c . -> . any/c))]\n   [update ((any/c . -> . any/c) any/c any/c . -> . (any/c . -> . any/c))]\n   [select ((any/c . -> . any/c) any/c . -> . any/c)])\n  (define (alloc) (λ (_) _))\n  (define (update f k v)\n    (λ (x) (if (equal? x k) v (f k))))\n  (define (select f x) (f x)))\n\n(module assert racket\n  (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n;; translated from Swamy et al. 2013\n(module main racket\n  (provide/contract\n   [main ((any/c . -> . any/c) . -> . (any/c . -> . any/c))])\n  (require (submod \"..\" obj) (submod \"..\" assert))\n  (define (main global)\n    (let* ([incf (λ (this args)\n                   (let ([x (select args \"0\")])\n                     (update x \"f\" (+ 1 (select x \"f\")))))]\n           [global (update global \"incf\" incf)]\n           [args (let ([x (update (alloc) \"f\" 0)])\n                   (update (alloc) \"0\" x))]\n           [res ((select global \"incf\") global args)])\n      (begin\n        (assert (= (select res \"f\") 1))\n        (let ([global (update global \"incf\" 0)])\n          global)))))\n\n(require 'main)\n(main •)\n\n"
,
safe_flatten:"(module lib racket\n  (provide/contract [append ((listof any/c) (listof any/c) . -> . (listof any/c))]))\n\n(module flatten racket\n  (provide/contract [flatten (any/c . -> . (listof any/c))])\n  (require (submod \"..\" lib))\n  (define (flatten x)\n    (cond\n      [(empty? x) empty]\n      [(cons? x) (append [flatten (car x)] [flatten (cdr x)])]\n      [else (cons x empty)])))\n\n(require 'flatten)\n(flatten •)\n\n"
,
safe_nth0:"(module nth0 racket\n  (provide/contract\n   [nth (integer? (listof integer?) . -> . integer?)]\n   [mk-list (integer? . -> . (listof integer?))]\n   [main (integer? . -> . integer?)])\n  (define (nth n xs)\n    (if (= n 0) (car xs) (nth (- n 1) (cdr xs))))\n  (define (mk-list n)\n    (if (< n 0) empty\n        (cons n (mk-list (- n 1)))))\n  (define (main n)\n    (let ([xs (mk-list n)])\n      (if (empty? xs) 0 (nth 0 xs)))))\n\n(require 'nth0)\n(main •)\n\n"
,
safe_ex_12:"(module carnum? racket\n  (provide/contract [carnum? (->i ([p cons?]) (res (p) (and/c boolean? (λ (a) (equal? a (number? (car p)))))))])\n  (define (carnum? p) (number? (car p))))\n\n(require 'carnum?)\n(carnum? •)\n\n"
,
safe_foldr:"(module foldr racket\n  (provide/contract\n   [foldr ((any/c any/c . -> . any/c) any/c (listof any/c) . -> . any/c)])\n  (define (foldr f z xs)\n    (if (empty? xs) z\n        (f (car xs) (foldr f z (cdr xs))))))\n\n(require 'foldr)\n(foldr • • •)\n\n"
,
safe_recip_contract:"(module recip racket\n  (provide/contract [recip (non-zero/c . -> . non-zero/c)]\n\t\t    [non-zero/c any/c])\n  (define (recip x) (/ 1 x))\n  (define non-zero/c (and/c number? (not/c zero?))))\n\n(require 'recip)\n(recip •)\n\n"
,
safe_tetris:"(module data racket\n  (provide/contract\n   [struct block ([x real?] [y real?] [color COLOR/C])]\n   [struct posn ([x real?] [y real?])]\n   [struct tetra ([center POSN/C] [blocks BSET/C])]\n   [struct world ([tetra TETRA/C] [blocks BSET/C])]\n   [posn=? (POSN/C POSN/C . -> . boolean?)]\n   [COLOR/C any/c]\n   [POSN/C any/c]\n   [BLOCK/C any/c]\n   [TETRA/C any/c]\n   [WORLD/C any/c]\n   [BSET/C any/c])\n  (define BSET/C (listof BLOCK/C))\n  (define COLOR/C symbol?)\n  (define POSN/C (struct/c posn real? real?))\n  (define BLOCK/C (struct/c block real? real? COLOR/C))\n  (define TETRA/C (struct/c tetra POSN/C BSET/C))\n  (define WORLD/C (struct/c world TETRA/C BSET/C))\n  \n  (struct posn (x y))\n  (struct block (x y color))\n  (struct tetra (center blocks))\n  (struct world (tetra blocks))\n  \n  (define (posn=? p1 p2)\n    (and (= (posn-x p1) (posn-x p2))\n         (= (posn-y p1) (posn-y p2)))))\n\n(module consts racket\n  (provide/contract [block-size integer?]\n           [board-width integer?]\n           [board-height integer?])\n  (define block-size 20)\n  (define board-height 20)\n  (define board-width 10))\n\n(module block racket\n  (provide/contract\n   [block-rotate-ccw (POSN/C BLOCK/C . -> . BLOCK/C)]\n   [block-rotate-cw (POSN/C BLOCK/C . -> . BLOCK/C)]\n   [block=? (BLOCK/C BLOCK/C . -> . boolean?)]\n   [block-move (real? real? BLOCK/C . -> . BLOCK/C)])\n  (require (submod \"..\" data))\n  \n  ;; block=? : Block Block -> Boolean\n  ;; Determines if two blocks are the same (ignoring color).\n  (define (block=? b1 b2)\n    (and (= (block-x b1) (block-x b2))\n         (= (block-y b1) (block-y b2))))\n  \n  ;; block-move : Number Number Block -> Block\n  (define (block-move dx dy b)\n    (block (+ dx (block-x b))\n           (+ dy (block-y b))\n           (block-color b)))\n  \n  ;; block-rotate-ccw : Posn Block -> Block\n  ;; Rotate the block 90 counterclockwise around the posn.\n  (define (block-rotate-ccw c b)\n    (block (+ (posn-x c) (- (posn-y c) (block-y b)))\n           (+ (posn-y c) (- (block-x b) (posn-x c)))\n           (block-color b)))\n  \n  ;; block-rotate-cw : Posn Block -> Block\n  ;; Rotate the block 90 clockwise around the posn.\n  (define (block-rotate-cw c b)\n    (block-rotate-ccw c (block-rotate-ccw c (block-rotate-ccw c b)))))\n\n(module list-fun racket\n  (provide/contract\n   [max (real? real? . -> . real?)]\n   [min (real? real? . -> . real?)]\n   [ormap ([BLOCK/C . -> . boolean?] (listof any/c) . -> . boolean?)]\n   [andmap ([BLOCK/C . -> . boolean?] (listof any/c) . -> . boolean?)]\n   [map ([BLOCK/C . -> . BLOCK/C] BSET/C . -> . BSET/C)]\n   [filter ([BLOCK/C . -> . boolean?] BSET/C . -> . BSET/C)]\n   [append (BSET/C BSET/C . -> . BSET/C)]\n   [length ((listof any/c) . -> . integer?)]\n   [foldr ([BLOCK/C BSET/C . -> . BSET/C] BSET/C BSET/C . -> . BSET/C)]\n   [foldr-i ([BLOCK/C image? . -> . image?] image? BSET/C . -> . image?)]\n   [foldr-n ((BLOCK/C real? . -> . real?) real? BSET/C . -> . real?)])\n  (require (submod \"..\" image) (submod \"..\" data)))\n\n(module bset racket\n  (provide/contract\n   [blocks-contains? (BSET/C BLOCK/C . -> . boolean?)]\n   [blocks=? (BSET/C BSET/C . -> . boolean?)]\n   [blocks-subset? (BSET/C BSET/C . -> . boolean?)]\n   [blocks-intersect (BSET/C BSET/C . -> . BSET/C)]\n   [blocks-count (BSET/C . -> . real?)]\n   [blocks-overflow? (BSET/C . -> . boolean?)]\n   [blocks-move (real? real? BSET/C . -> . BSET/C)]\n   [blocks-rotate-cw (POSN/C BSET/C . -> . BSET/C)]\n   [blocks-rotate-ccw (POSN/C BSET/C . -> . BSET/C)]\n   [blocks-change-color (BSET/C COLOR/C . -> . BSET/C)]\n   [blocks-row (BSET/C real? . -> . BSET/C)]\n   [full-row? (BSET/C real? . -> . boolean?)]\n   [blocks-union (BSET/C BSET/C . -> . BSET/C)]\n   [blocks-max-x (BSET/C . -> . real?)]\n   [blocks-min-x (BSET/C . -> . real?)]\n   [blocks-max-y (BSET/C . -> . real?)])\n  (require (submod \"..\" data) (submod \"..\" block) (submod \"..\" list-fun) (submod \"..\" consts))\n  \n  ;; blocks-contains? : BSet Block -> Boolean\n  ;; Determine if the block is in the set of blocks.\n  (define (blocks-contains? bs b)\n    (ormap (λ (c) (block=? b c)) bs))\n  \n  ;; blocks-subset? : BSet BSet -> Boolean\n  ;; is every element in bs1 also in bs2?\n  (define (blocks-subset? bs1 bs2)\n    (andmap (λ (b) (blocks-contains? bs2 b)) bs1))\n  \n  ;; blocks=? : BSet BSet -> Boolean\n  ;; Determine if given sets of blocks are equal.\n  (define (blocks=? bs1 bs2)\n    (and (blocks-subset? bs1 bs2)\n         (blocks-subset? bs2 bs1)))\n  \n  ;; blocks-intersect : BSet BSet -> BSet\n  ;; Return the set of blocks that appear in both sets.\n  (define (blocks-intersect bs1 bs2)\n    (filter (λ (b) (blocks-contains? bs2 b)) bs1))\n  \n  ;; blocks-count : BSet -> Nat\n  ;; Return the number of blocks in the set.\n  (define (blocks-count bs)\n    (length bs))  ;; No duplicates, cardinality = length.\n  \n  ;; blocks-move : Number Number BSet -> BSet\n  ;; Move each block by the given X & Y displacement.\n  (define (blocks-move dx dy bs)\n    (map (λ (b) (block-move dx dy b)) bs))\n  \n  ;; blocks-rotate-ccw : Posn BSet -> BSet\n  ;; Rotate the blocks 90 counterclockwise around the posn.\n  (define (blocks-rotate-ccw c bs)\n    (map (λ (b) (block-rotate-ccw c b)) bs))\n  \n  ;; blocks-rotate-cw : Posn BSet -> BSet\n  ;; Rotate the blocks 90 clockwise around the posn.\n  (define (blocks-rotate-cw c bs)\n    (map (λ (b) (block-rotate-cw c b)) bs))\n  \n  ;; blocks-change-color : BSet Color -> BSet\n  (define (blocks-change-color bs c)\n    (map (λ (b) (block (block-x b) (block-y b) c))\n         bs))\n  \n  ;; blocks-row : BSet Number -> BSet\n  ;; Return the set of blocks in the given row.\n  (define (blocks-row bs i)\n    (filter (λ (b) (= i (block-y b))) bs))\n  \n  ;; full-row? : BSet Nat -> Boolean\n  ;; Are there a full row of blocks at the given row in the set.\n  (define (full-row? bs i)\n    (= board-width (blocks-count (blocks-row bs i))))\n  \n  ;; blocks-overflow? : BSet -> Boolean\n  ;; Have any/c of the blocks reach over the top of the board?\n  (define (blocks-overflow? bs)\n    (ormap (λ (b) (<= (block-y b) 0)) bs))\n  \n  ;; blocks-union : BSet BSet -> BSet\n  ;; Union the two sets of blocks.\n  (define (blocks-union bs1 bs2)\n    (foldr (λ (b bs)\n             (cond [(blocks-contains? bs b) bs]\n                   [else (cons b bs)]))\n           bs2\n           bs1))\n  \n  ;; blocks-max-y : BSet -> Number\n  ;; Compute the maximum y coordinate;\n  ;; if set is empty, return 0, the coord of the board's top edge.\n  (define (blocks-max-y bs)\n    (foldr-n (λ (b n) (max (block-y b) n)) 0 bs))\n  \n  ;; blocks-min-x : BSet -> Number\n  ;; Compute the minimum x coordinate;\n  ;; if set is empty, return the coord of the board's right edge.\n  (define (blocks-min-x bs)\n    (foldr-n (λ (b n) (min (block-x b) n)) board-width bs))\n  \n  ;; blocks-max-x : BSet -> Number\n  ;; Compute the maximum x coordinate;\n  ;; if set is empty, return 0, the coord of the board's left edge.\n  (define (blocks-max-x bs)\n    (foldr-n (λ (b n) (max (block-x b) n)) 0 bs)))\n\n(module elim racket\n  (provide/contract\n   [eliminate-full-rows (BSET/C . -> . BSET/C)])\n  (require (submod \"..\" data) (submod \"..\" bset) (submod \"..\" consts))\n  ;; eliminate-full-rows : BSet -> BSet\n  ;; Eliminate all full rows and shift down appropriately.\n  (define (eliminate-full-rows bs)\n    (elim-row bs board-height 0))\n  \n  (define (elim-row bs i offset)\n    (cond [(< i 0) empty]\n          [(full-row? bs i)   (elim-row bs (sub1 i) (add1 offset))]\n          [else (blocks-union (elim-row bs (sub1 i) offset)\n                              (blocks-move 0 offset (blocks-row bs i)))])))\n\n(module tetras racket\n  (provide/contract ;[tetras (listof TETRA/C)]\n   [tetra-move (integer? integer? TETRA/C . -> . TETRA/C)]\n   [tetra-rotate-ccw (TETRA/C . -> . TETRA/C)]\n   [tetra-rotate-cw (TETRA/C . -> . TETRA/C)]\n   [tetra-overlaps-blocks? (TETRA/C BSET/C . -> . boolean?)]\n   [build-tetra-blocks (COLOR/C real? real? integer? integer? integer? integer? integer? integer? integer? integer?\n                                . -> .  TETRA/C)]\n   [tetra-change-color (TETRA/C COLOR/C . -> . TETRA/C)])\n  (require (submod \"..\" bset) (submod \"..\" data) (submod \"..\" consts) (submod \"..\" block))\n  ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n  ;; Tetras\n  \n  ;; tetra-move : Number Number Tetra -> Tetra\n  ;; Move the Tetra by the given X & Y displacement.\n  (define (tetra-move dx dy t)\n    (tetra (posn (+ dx (posn-x (tetra-center t)))\n                 (+ dy (posn-y (tetra-center t))))\n           (blocks-move dx dy (tetra-blocks t))))\n  \n  ;; tetra-rotate-ccw : Tetra -> Tetra\n  ;; Rotate the tetra 90 degrees counterclockwise around its center.\n  (define (tetra-rotate-ccw t)\n    (tetra (tetra-center t)\n           (blocks-rotate-ccw (tetra-center t)\n                              (tetra-blocks t))))\n  \n  ;; tetra-rotate-cw : Tetra -> Tetra\n  ;; Rotate the tetra 90 degrees clockwise around its center.\n  (define (tetra-rotate-cw t)\n    (tetra (tetra-center t)\n           (blocks-rotate-cw (tetra-center t)\n                             (tetra-blocks t))))\n  \n  ;; tetra-overlaps-blocks? : Tetra BSet -> Boolean\n  ;; Is the tetra on any/c of the blocks?\n  (define (tetra-overlaps-blocks? t bs)\n    (false? (false? (blocks-intersect (tetra-blocks t) bs))))\n  \n  ;; tetra-change-color : Tetra Color -> Tetra\n  ;; Change the color of the given tetra.\n  (define (tetra-change-color t c)\n    (tetra (tetra-center t)\n           (blocks-change-color (tetra-blocks t) c)))\n  \n  (define (build-tetra-blocks color xc yc x1 y1 x2 y2 x3 y3 x4 y4)\n    (tetra-move 3 0 \n                (tetra (posn xc yc)\n                       (list (block x1 y1 color)\n                             (block x2 y2 color)\n                             (block x3 y3 color)\n                             (block x4 y4 color))))))\n\n(module world racket\n  (provide/contract [world-key-move (WORLD/C string? . -> . WORLD/C)]\n           [next-world (WORLD/C . -> . WORLD/C)]\n           [ghost-blocks (WORLD/C . -> . BSET/C)])\n  (require (submod \"..\" data) (submod \"..\" bset) (submod \"..\" block) (submod \"..\" tetras)\n\t   (submod \"..\" aux) (submod \"..\" elim) (submod \"..\" consts))\n  \n  ;; touchdown : World -> World\n  ;; Add the current tetra's blocks onto the world's block list,\n  ;; and create a new tetra.\n  (define (touchdown w)\n    (world (list-pick-random tetras)\n           (eliminate-full-rows (blocks-union (tetra-blocks (world-tetra w))\n                                              (world-blocks w)))))\n  \n  ;; world-jump-down : World -> World\n  ;; Take the current tetra and move it down until it lands.\n  (define (world-jump-down w)\n    (cond [(landed? w) w]\n          [else (world-jump-down (world (tetra-move 0 1 (world-tetra w))\n                                        (world-blocks w)))]))\n  \n  ;; landed-on-blocks? : World -> Boolean\n  ;; Has the current tetra landed on blocks?\n  ;; I.e., if we move the tetra down 1, will it touch any/c existing blocks?\n  (define (landed-on-blocks? w)\n    (tetra-overlaps-blocks? (tetra-move 0 1 (world-tetra w))\n                            (world-blocks w)))\n  \n  ;; landed-on-floor? : World -> Boolean\n  ;; Has the current tetra landed on the floor?\n  (define (landed-on-floor? w)\n    (= (blocks-max-y (tetra-blocks (world-tetra w)))\n       (sub1 board-height)))\n  \n  ;; landed? : World -> Boolean\n  ;; Has the current tetra landed?\n  (define (landed? w)\n    (or (landed-on-blocks? w)\n        (landed-on-floor? w)))\n  \n  ;; next-world : World -> World\n  ;; Step the world, either touchdown or move the tetra down on step.\n  (define (next-world w)\n    (cond [(landed? w) (touchdown w)]\n          [else (world (tetra-move 0 1 (world-tetra w))\n                       (world-blocks w))]))\n  \n  ;; try-new-tetra : World Tetra -> World\n  ;; Make a world with the new tetra *IF* if doesn't lie on top of some other\n  ;; block or lie off the board. Otherwise, no change.\n  (define (try-new-tetra w new-tetra)\n    (cond [(or (<  (blocks-min-x (tetra-blocks new-tetra)) 0)\n               (>= (blocks-max-x (tetra-blocks new-tetra)) board-width)\n               (tetra-overlaps-blocks? new-tetra (world-blocks w)))\n           w]\n          [else (world new-tetra (world-blocks w))]))\n  \n  ;; world-move : Number Number World -> World\n  ;; Move the Tetra by the given X & Y displacement, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-move dx dy w)\n    (try-new-tetra w (tetra-move dx dy (world-tetra w))))\n  \n  ;; world-rotate-ccw : World -> World\n  ;; Rotate the Tetra 90 degrees counterclockwise, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-rotate-ccw w)\n    (try-new-tetra w (tetra-rotate-ccw (world-tetra w))))\n  \n  ;; world-rotate-cw : World -> World\n  ;; Rotate the Tetra 90 degrees clockwise, but only if you can.\n  ;; Otherwise stay put.\n  (define (world-rotate-cw w)\n    (try-new-tetra w (tetra-rotate-cw (world-tetra w))))\n  \n  ;; ghost-blocks : World -> BSet\n  ;; Gray blocks representing where the current tetra would land.\n  (define (ghost-blocks w)\n    (tetra-blocks (tetra-change-color (world-tetra (world-jump-down w))\n                                      'gray)))\n  \n  ;; world-key-move : World KeyEvent -> World\n  ;; Move the world according to the given key event.\n  (define (world-key-move w k)\n    (cond [(equal? k \"left\") (world-move neg-1 0 w)]\n          [(equal? k \"right\") (world-move 1 0 w)]\n          [(equal? k \"down\") (world-jump-down w)]\n          [(equal? k \"a\") (world-rotate-ccw w)]\n          [(equal? k \"s\") (world-rotate-cw w)]\n          [else w])))\n\n(module image racket\n  (provide/contract\n   [image? (any/c . -> . boolean?)]\n   [overlay (image? image? . -> . image?)]\n   [circle (real? real? string? . -> . image?)]\n   [rectangle (real? real? COLOR/C COLOR/C . -> . image?)]\n   [place-image (image? real? real? image? . -> . image?)]\n   [empty-scene (real? real? . -> . image?)])\n  (require (submod \"..\" data))\n  (struct image (impl)))\n\n(module aux racket\n  (require (submod \"..\" data))\n  (provide/contract\n   [list-pick-random ((listof TETRA/C) . -> . TETRA/C)]\n   [neg-1 integer?] ;; ha!\n   [tetras (listof TETRA/C)]))\n\n(module visual racket\n  (provide/contract\n   [world->image (WORLD/C . -> . image?)]\n   [blocks->image (BSET/C . -> . image?)]\n   [block->image (BLOCK/C . -> . image?)]\n   [place-block (BLOCK/C image? . -> . image?)])\n  (require (submod \"..\" image) (submod \"..\" data) (submod \"..\" consts) (submod \"..\" world)\n\t   (submod \"..\" list-fun) (submod \"..\" aux))\n  \n  ;; Visualize whirled peas\n  ;; World -> Scene\n  (define (world->image w)\n    (place-image (blocks->image (append (tetra-blocks (world-tetra w))\n                                        (append (ghost-blocks w)\n                                                (world-blocks w))))\n                 0 0 \n                 (empty-scene (* board-width block-size)\n                              (* board-height block-size))))\n  \n  ;; BSet -> Scene\n  (define (blocks->image bs)\n    (foldr-i (λ (b img)\n               (cond [(<= 0 (block-y b)) (place-block b img)]\n                     [else img]))\n             (empty-scene (add1 (* board-width block-size)) \n                          (add1 (* board-height block-size)))\n             bs))\n  \n  ;; Visualizes a block.\n  ;; Block -> Image\n  (define (block->image b)\n    (overlay \n     (rectangle (add1 block-size) (add1 block-size) 'solid (block-color b))\n     (rectangle (add1 block-size) (add1 block-size) 'outline 'black)))\n  \n  ;; Block Scene -> Scene\n  (define (place-block b scene)\n    (place-image (block->image b)\n                 (+ (* (block-x b) block-size) (/ block-size 2))\n                 (+ (* (block-y b) block-size) (/ block-size 2))\n                 scene))\n  \n  (define (world0)\n    (world (list-pick-random tetras) #f)))\n\n(require 'block 'bset 'data 'elim 'tetras 'visual 'image 'world)\n(amb\n (block-rotate-cw • •)\n (block-rotate-ccw • •)\n (block=? • •)\n (block-move • • •)\n (blocks-contains? • •)\n (blocks-subset? • •)\n (blocks=? • •)\n (blocks-count •)\n (blocks-intersect • •)\n (blocks-overflow? •)\n (blocks-move • • •)\n (blocks-rotate-ccw • •)\n (blocks-rotate-cw • •)\n (blocks-change-color • •)\n (full-row? • •)\n (blocks-row • •)\n (blocks-union • •)\n (blocks-max-x •)\n (blocks-max-y •)\n (blocks-min-x •)\n (world-blocks •)\n (world-tetra •)\n (world • •)\n (world? •)\n (tetra • •)\n (tetra-center •)\n (tetra-blocks •)\n (tetra? •)\n (block • • •)\n (block? •)\n (block-color •)\n (block-x •)\n (block-y •)\n (eliminate-full-rows •)\n (tetra-overlaps-blocks? • •)\n (build-tetra-blocks • • • • • • • • • • •) \n (world->image •)\n (blocks->image •)\n (world-key-move • •)\n (next-world •)\n (ghost-blocks •))\n\n"
,
safe_ex_02:"(module f racket\n  (provide/contract [f ((or/c string? number?) . -> . number?)])\n  (define (f x)\n    (if (number? x) (add1 x) (string-length x))))\n\n(require 'f)\n(f •)\n\n"
,
safe_dvh_2:"(module dvh-2 racket\n  (provide/contract\n   [main (->i ([x number?])\n\t      (res (x) (->i ([y (and/c number? (=/c x))])\n\t\t\t    (res (y) (=/c x)))))])\n\n  (define (main x) (lambda (y) y)))\n\n(require 'dvh-2)\n((main •) •)\n\n"
,
safe_ho_opaque:"(module db1 racket\n  (provide/contract\n   [db1 ([zero? . -> . zero?] . -> . [zero? . -> . zero?])])\n  (define (db1 f)\n    (λ (x) (f (f x)))))\n\n(module f racket\n  (provide/contract \n   [f (zero? . -> . number?)]))\n\n(require 'db1 'f)\n((db1 f) 0)\n\n"
,
safe_last:"(module Y racket\n  (provide/contract [Y (([any/c . -> . any/c] . -> . [any/c . -> . any/c]) . -> . [any/c . -> . any/c])])\n  (define (Y f)\n    (λ (y)\n      (((λ (x) (f (λ (z) ((x x) z))))\n        (λ (x) (f (λ (z) ((x x) z)))))\n       y))))\n\n(module last racket\n  (require (submod \"..\" Y))\n  (provide/contract [last ((cons/c any/c (listof any/c)) . -> . any/c)])\n  (define (last l)\n    ((Y (λ (f)\n          (λ (x)\n            (if (empty? (cdr x)) (car x) (f (cdr x))))))\n     l)))\n\n(require 'last)\n(last •)\n\n"
,
safe_mem:"(module mem racket\n  (provide/contract\n   [mk-list (->i ([_ integer?] [x integer?])\n\t\t (res (_ x) (and/c (listof integer?)\n\t\t\t\t   (λ (l) (or (empty? l) (mem x l))))))]\n   [mem (integer? (listof integer?) . -> . boolean?)])\n  (define (mk-list n x)\n    (if (< n 0) empty (cons x (mk-list (- n 1) x))))\n  (define (mem x xs)\n    (if (empty? xs) #f (or (= x (car xs)) (mem x (cdr xs))))))\n\n(require 'mem)\n(mk-list • •)\n\n"
,
safe_tricky:"(module f racket\n  (provide/contract\n   [f (integer? . -> . integer?)])\n  (define (f x)\n    (if (zero? x) 0\n        (if (zero? (f (sub1 x))) 7 8))))\n\n(require 'f)\n(f •)\n\n"
,
safe_rsa:"(module keygen racket\n  (require (submod \"..\" prime?))\n  (provide/contract [keygen (any/c . -> . (λ (x) (prime? x)))]))\n\n(module rsa racket\n  (require (submod \"..\" prime?))\n  (provide/contract [rsa ((λ (x) (prime? x)) any/c . -> . any/c)]))\n\n(module prime? racket\n  (provide/contract [prime? (any/c . -> . any/c)]))\n\n(module enc racket\n  (provide/contract [enc (any/c . -> . any/c)])\n  (require (submod \"..\" rsa) (submod \"..\" keygen))\n  (define (enc x) (rsa (keygen #t) x)))\n\n(require 'enc)\n(enc •)\n\n"
,
safe_ex_05:"(module f racket\n  (provide/contract [f (any/c any/c . -> . number?)])\n  (define (f x y)\n    (if (and (number? x) (string? y)) (+ x (string-length y)) 0)))\n\n(require 'f)\n(f • •)\n\n"
,
safe_foldl1:"(module foldl1 racket\n  (provide/contract [foldl1 ((any/c any/c . -> . any/c) (nelistof any/c) . -> . any/c)])\n  (define (foldl1 f xs)\n    (let ([z (car xs)]\n          [zs (cdr xs)])\n      (if (empty? zs) z\n          (foldl1 f (cons (f z (car zs)) (cdr zs)))))))\n\n(require 'foldl1)\n(foldl1 • •)\n\n"
,
safe_ex_13:"(module ex-13 racket\n  (provide/contract [f (any/c any/c . -> . true?)])\n  (define (f x y)\n    (cond\n      [(and (number? x) (string? y)) (and (number? x) (string? y))]\n      [(number? x) (and (number? x) (not (string? y)))]\n      [else (not (number? x))])))\n(require 'ex-13)\n(f • •)\n\n"
,
safe_map:"(module map racket\n  (provide/contract\n   [map (->i ([_ (any/c . -> . any/c)] [l (listof any/c)])\n\t     (res (_ l)\n\t\t  (and/c (listof any/c)\n\t\t\t (λ (r) (equal? (empty? l) (empty? r))))))])\n  (define (map f xs)\n    (if (empty? xs) empty\n        (cons (f (car xs)) (map f (cdr xs))))))\n\n(require 'map)\n(map • •)\n\n"
,
safe_mini_church:"((lambda (plus)\n   ((lambda (mult)\n      ((lambda (pred)\n         ((lambda (sub)\n            ((lambda (church0)\n               ((lambda (church1)\n                  ((lambda (church2)\n                     ((lambda (church3)\n                        ((lambda (true)\n                           ((lambda (false)\n                              ((lambda (church0?)\n                                 ((lambda (Y)\n                                    ((lambda (church=?)\n                                       ((church=? ((mult church2) ((plus church1) church3)))\n                                        ((plus ((mult church2) church1)) ((mult church2) church3))))\n                                     (Y\n                                      (lambda (church=?)\n                                        (lambda (e1)\n                                          (lambda (e2)\n                                            (((church0? e1) ;; IF\n                                              (lambda (thendummy) (church0? e2)))\n                                             (lambda (elsedummy1)\n                                               (((church0? e2) ;; IF\n                                                 false)\n                                                (lambda (elsedummy2) ((church=? ((sub e1) church1)) ((sub e2) church1))))))))))))\n                                  (lambda (yf)\n                                    ((lambda (yg) (yg yg))\n                                     (lambda (yx) (yf (λ (yv) ((yx yx) yv))))))))\n                               (lambda (z) ((z (lambda (zx) false)) true))))\n                            (lambda (fa) (lambda (fb) (fb (lambda (bdummy) bdummy))))))\n                         (lambda (ta) (lambda (tb) (ta (lambda (adummy) adummy))))))\n                      (lambda (f3) (lambda (x3) (f3 (f3 (f3 x3)))))))\n                   (lambda (f2) (lambda (x2) (f2 (f2 x2))))))\n                (lambda (f1) (lambda (x1) (f1 x1)))))\n             (lambda (f0) (lambda (x0) x0))))\n          (lambda (s1)\n            (lambda (s2)\n              ((s2 pred) s1)))))\n       (lambda (n)\n         (lambda (rf)\n           (lambda (rx)\n             (((n (lambda (g) (lambda (h) (h (g rf)))))\n               (lambda (ignored) rx))\n              (lambda (id) id)))))))\n    (lambda (m1)\n      (lambda (m2)\n        (lambda (mf) (m2 (m1 mf)))))))\n (lambda (p1)\n   (lambda (p2)\n     (lambda (pf)\n       (lambda (x) ((p1 pf) ((p2 pf) x)))))))\n"
,
safe_last_pair:"(module lastpair racket\n  (provide/contract\n   [lastpair (cons? . -> . cons?)])\n  (define (lastpair x)\n    (if (cons? (cdr x)) (lastpair (cdr x)) x)))\n\n(require 'lastpair)\n(lastpair (cons • •))\n\n"
,
safe_fold_div:"(module rand racket (provide/contract (rand (-> integer?))))\n\n(module fold-div racket\n  (provide/contract\n   [foldl ((real? real? . -> . real?) real? (listof real?) . -> . real?)]\n   [randpos (-> integer?)]\n   [mk-list (integer? . -> . (listof (and/c integer? positive?)))]\n   [main (integer? integer? . -> . real?)])\n  (require (submod \"..\" rand))\n  (define (foldl f z l)\n    (if (empty? l) z (foldl f (f z (car l)) (cdr l))))\n  (define (randpos)\n    (let ([n (rand)]) (if (> n 0) n (randpos))))\n  (define (mk-list n)\n    (if (<= n 0) empty\n        (cons (randpos) (mk-list (- n 1)))))\n  (define (main n m) (foldl / m (mk-list n))))\n\n(require 'fold-div)\n(main • •)\n\n"
,
safe_terauchi_mult_cps:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (mult x y k)\n    (if (or (<= x 0) (<= y 0)) (k 0)\n        (mult x (- y 1) (acc x k))))\n  (define (acc z m) (λ (r) (m (+ z r))))\n  (define (check100 w) (assert (<= 100 w)))\n  (define (main) (mult 100 100 check100)))\n\n(require 'm)\n(main)\n\n"
,
safe_guess:"(module IO racket\n  (provide/contract\n   [display (string? . -> . any/c)]\n   [error (string? . -> . any/c)]\n   [read (-> any/c)]))\n\n(module guess racket\n  (provide/contract [guess (integer? . -> . any/c)])\n  (require (submod \"..\" IO))\n  (define (guess target)\n    (let ([input (read)])\n      (cond\n        [(not (or (equal? input 'quit) (integer? input)))\n         (error \"Invalid type for input\")]\n        [(equal? input 'quit) 'quit]\n        [(< input target)\n         (begin (display \"Too low!\\n\") (guess target))]\n        [(> input target)\n         (begin (display \"Too high!\\n\") (guess target))]\n        [else (begin (display \"Correct!\\n\") 'done)]))))\n\n(require 'guess)\n(guess •)\n\n"
,
safe_factorial_acc:"(module factorial racket\n  (provide/contract\n   [factorial (integer? . -> . integer?)])\n  (define (factorial n)\n    (factorial-acc n 1))\n  (define (factorial-acc n acc)\n    (if (zero? n) acc\n        (factorial-acc (sub1 n) (* n acc)))))\n\n(require 'factorial)\n(factorial •)\n\n"
,
safe_even_odd:"(module eo racket\n  (provide/contract\n   [even? (integer? . -> . boolean?)]\n   [odd? (integer? . -> . boolean?)])\n  (define (even? n)\n    (if (zero? n) #t (odd? (sub1 n))))\n  (define (odd? n)\n    (if (zero? n) #f (even? (sub1 n)))))\n\n(require 'eo)\n(even? •)\n\n"
,
safe_terauchi_boolflip:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (f x y) (if x (f y x) (g x y)))\n  (define (g x y) (assert y))\n  (define (h x) (assert x))\n  (define (main) (if (< 0 1) (f (< 0 1) (< 1 0)) (h (< 1 0)))))\n(require 'm)\n(main)\n\n"
,
safe_subst:"(module subst* racket\n  (provide/contract\n   [subst* (any/c any/c any/c . -> . any/c)])\n  (define (subst* new old t)\n    (cond\n      [(equal? old t) new]\n      [(cons? t) (cons (subst* new old (car t))\n                       (subst* new old (cdr t)))]\n      [else t])))\n\n(require 'subst*)\n(subst* • • •)\n\n"
,
safe_cpstak:"(module tak racket\n  (provide/contract\n   [tak (integer? integer? integer? (integer? . -> . integer?) . -> . integer?)])\n  (define (tak x y z k)\n    (if (not (< y x))\n        (k z)\n        (tak (- x 1)\n             y\n             z\n             (lambda (v1)\n               (tak (- y 1)\n                    z\n                    x\n                    (lambda (v2)\n                      (tak (- z 1)\n                           x\n                           y\n                           (lambda (v3)\n                             (tak v1 v2 v3 k))))))))))\n\n(module nums racket\n  (provide/contract [a integer?] [b integer?] [c integer?]))\n\n(require 'tak 'nums)\n(tak a b c (lambda (x) x))\n\n"
,
safe_taut:"(module taut racket\n  (provide/contract\n   [taut ([μ/c (X) (or/c boolean? [boolean? . -> . X])] . -> . boolean?)])\n  (define (taut b)\n    (cond\n      [(boolean? b) b]\n      [else (and (taut (b #t)) (taut (b #f)))])))\n\n(require 'taut)\n(taut •)\n\n"
,
safe_mappend:"(module map-append racket\n  (provide/contract\n   [map-append ((any/c . -> . (listof any/c)) (listof any/c) . -> . (listof any/c))]\n   [append ((listof any/c) (listof any/c) . -> . (listof any/c))])\n  \n  (define (append xs ys)\n    (if (empty? xs) ys\n        (cons (car xs) (append (cdr xs) ys))))\n  \n  (define (map-append f xs)\n    (if (empty? xs) empty\n        (append (f (car xs)) (map-append f (cdr xs))))))\n\n(require 'map-append)\n(map-append • •)\n\n"
,
safe_intro3:"(module f racket\n  (provide/contract [f (integer? (integer? . -> . any/c) . -> . any/c)])\n  (define (f x g) (g (+ x 1))))\n(module h racket\n  (provide/contract [h (->i ([z integer?]) (res (z) ((and/c integer? (>/c z)) . -> . any/c)))])\n  (define (h z) (λ (y) 'unit)))\n(module main racket\n  (provide/contract [main (integer? . -> . any/c)])\n  (require (submod \"..\" f) (submod \"..\" h))\n  (define (main n)\n    (if (>= n 0) (f n (h n)) 'unit)))\n\n(require 'main)\n(main •)\n\n"
,
safe_fibonacci:"(module fib racket\n  (provide/contract\n   [fib (integer? . -> . integer?)])\n  (define (fib n)\n    (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))\n\n(require 'fib)\n(fib •)\n\n"
,
safe_max:"(module max racket\n  (provide/contract [max ((integer? integer? . -> . integer?) integer? integer? integer? . -> . integer?)])\n  (define (max max2 x y z) (max2 (max2 x y) z)))\n\n(module f racket\n  (provide/contract [f (integer? integer? . -> . integer?)])\n  (define (f x y) (if (>= x y) x y)))\n\n(module main racket\n  (provide/contract [main (->i ([x integer?] [y integer?] [z integer?])\n\t\t      (res (x y z) (and/c integer? (λ (m) (= (f x m) m)))))])\n  (require (submod \"..\" max) (submod \"..\" f))\n  (define (main x y z)\n    (max f x y z)))\n\n(require 'main)\n(main • • •)\n\n"
,
safe_neg:"(module g racket\n  (provide/contract [g (integer? . -> . (any/c . -> . integer?))])\n  (define (g x) (λ (_) x)))\n\n(module twice racket\n  (provide/contract\n   [twice (((any/c . -> . integer?) . -> . (any/c . -> . integer?)) (any/c . -> . integer?) any/c . -> . integer?)])\n  (define (twice f x y) ((f (f x)) y)))\n\n(module neg racket\n  (provide/contract [neg ((any/c . -> . integer?) . -> . (any/c . -> . integer?))])\n  (define (neg x) (λ (_) (- 0 (x #f)))))\n\n(module main racket\n  (provide/contract [main (integer? . -> . (and/c integer? (>=/c 0)))])\n  (require (submod \"..\" twice) (submod \"..\" neg) (submod \"..\" g))\n  (define (main n)\n    (if (>= n 0)\n        (twice neg (g n) 'unit)\n        42)))\n\n(require 'main)\n(main •)\n\n"
,
safe_member:"(module member racket\n  (provide/contract\n   [member (any/c (listof any/c) . -> . (listof any/c))])\n  (define (member x l)\n    (if (empty? l) empty\n        (if (equal? x (car l)) l (member x (cdr l))))))\n\n(require 'member)\n(member • •)\n\n"
,
safe_dvh_1:"(module dvh-1 racket\n  (provide/contract\n   [main (->i ([z (and/c number? (=/c 5))])\n\t      (res (z) (=/c z)))])\n\n  (define (main x) (- (+ x x) x)))\n\n(require 'dvh-1)\n(main •)\n\n"
,
safe_snake:"(module image racket\n  (provide/contract\n   [image/c any/c]\n   [circle (real? string? string? . -> . image/c)]\n   [empty-scene (real? real? . -> . image/c)]\n   [place-image (image/c real? real? image/c . -> . image/c)])\n  (define image/c (λ (x) (image? x)))\n  (define (image? x) •))\n\n(module data racket\n  (provide/contract\n   [struct posn ([x real?] [y real?])]\n   [posn=? (POSN/C POSN/C . -> . boolean?)]\n   [struct snake ([dir DIR/C] [segs (nelistof POSN/C)])]\n   [struct world ([snake SNAKE/C] [food POSN/C])]\n   [DIR/C any/c]\n   [POSN/C any/c]\n   [SNAKE/C any/c]\n   [WORLD/C any/c])\n  \n  (define DIR/C (one-of/c \"up\" \"down\" \"left\" \"right\"))\n  (define POSN/C (struct/c posn real? real?))\n  (define SNAKE/C (struct/c snake DIR/C (nelistof POSN/C)))\n  (define WORLD/C (struct/c world SNAKE/C POSN/C))\n  \n  (struct posn (x y))\n  (define (posn=? p1 p2)\n    (and (= (posn-x p1) (posn-x p2))\n         (= (posn-y p1) (posn-y p2))))\n  \n  (struct snake (dir segs))\n  (struct world (snake food)))\n\n(module const racket\n  (provide/contract\n   [WORLD (-> WORLD/C)]\n   [BACKGROUND (-> image/c)]\n   [FOOD-IMAGE (-> image/c)]\n   [SEGMENT-IMAGE (-> image/c)]\n   [GRID-SIZE real?]\n   [BOARD-HEIGHT-PIXELS (-> real?)]\n   [BOARD-WIDTH real?]\n   [BOARD-HEIGHT real?])\n  (require (submod \"..\" image) (submod \"..\" data))\n  \n  (define GRID-SIZE 30)\n  (define BOARD-HEIGHT 20)\n  (define BOARD-WIDTH 30)\n  (define (BOARD-HEIGHT-PIXELS) (* GRID-SIZE BOARD-HEIGHT))\n  (define (BOARD-WIDTH-PIXELS) (* GRID-SIZE BOARD-WIDTH))\n  (define (BACKGROUND) (empty-scene (BOARD-WIDTH-PIXELS) (BOARD-HEIGHT-PIXELS)))\n  (define (SEGMENT-RADIUS) (/ GRID-SIZE 2))\n  (define (SEGMENT-IMAGE)  (circle (SEGMENT-RADIUS) \"solid\" \"red\"))\n  (define (FOOD-RADIUS) (SEGMENT-RADIUS))\n  (define (FOOD-IMAGE)  (circle (FOOD-RADIUS) \"solid\" \"green\"))\n  (define (WORLD) (world (snake \"right\" (cons (posn 5 3) empty))\n                         (posn 8 12))))\n\n(module collide racket\n  (provide/contract\n   [snake-wall-collide? (SNAKE/C . -> . boolean?)]\n   [snake-self-collide? (SNAKE/C . -> . boolean?)])\n  (require (submod \"..\" data) (submod \"..\" const))\n  \n  ;; snake-wall-collide? : Snake -> Boolean\n  ;; Is the snake colliding with any/c of the walls?\n  (define (snake-wall-collide? snk)\n    (head-collide? (car (snake-segs snk))))\n  \n  ;; head-collide? : Posn -> Boolean\n  (define (head-collide? p)\n    (or (<= (posn-x p) 0)\n        (>= (posn-x p) BOARD-WIDTH)\n        (<= (posn-y p) 0)\n        (>= (posn-y p) BOARD-HEIGHT)))\n  \n  ;; snake-self-collide? : Snake -> Boolean\n  (define (snake-self-collide? snk)\n    (segs-self-collide? (car (snake-segs snk))\n                        (cdr (snake-segs snk))))\n  \n  ;; segs-self-collide? : Posn Segs -> Boolean\n  (define (segs-self-collide? h segs)\n    (cond [(empty? segs) #f]\n          [else (or (posn=? (car segs) h)\n                    (segs-self-collide? h (cdr segs)))])))\n\n(module cut-tail racket\n  (provide/contract\n   [cut-tail ((nelistof POSN/C) . -> . (listof POSN/C))])\n  (require (submod \"..\" data))\n  ;; NeSegs is one of:\n  ;; - (cons Posn empty)\n  ;; - (cons Posn NeSegs)\n  \n  ;; cut-tail : NeSegs -> Segs\n  ;; Cut off the tail.\n  (define (cut-tail segs)\n    (let ([r (cdr segs)])\n      (cond [(empty? r) empty]\n            [else (cons (car segs) (cut-tail r))]))))\n\n(module motion-help racket\n  (provide/contract\n   [snake-slither (SNAKE/C . -> . SNAKE/C)]\n   [snake-grow (SNAKE/C . -> . SNAKE/C)])\n  (require (submod \"..\" data) (submod \"..\" cut-tail))\n  \n  ;; next-head : Posn Direction -> Posn\n  ;; Compute next position for head.\n  (define (next-head seg dir)\n    (cond [(equal? \"right\" dir) (posn (add1 (posn-x seg)) (posn-y seg))]\n          [(equal? \"left\" dir)  (posn (sub1 (posn-x seg)) (posn-y seg))]\n          [(equal? \"down\" dir)  (posn (posn-x seg) (sub1 (posn-y seg)))]\n          [else                 (posn (posn-x seg) (add1 (posn-y seg)))]))\n  \n  ;; snake-slither : Snake -> Snake\n  ;; move the snake one step\n  (define (snake-slither snk)\n    (let ([d (snake-dir snk)])\n      (snake d\n             (cons (next-head (car (snake-segs snk))\n                              d)\n                   (cut-tail (snake-segs snk))))))\n  \n  ;; snake-grow : Snake -> Snake\n  ;; Grow the snake one segment.\n  (define (snake-grow snk)\n    (let ([d (snake-dir snk)])\n      (snake d\n             (cons (next-head (car (snake-segs snk))\n                              d)\n                   (snake-segs snk))))))\n\n(module motion racket\n  (provide/contract\n   [world-change-dir (WORLD/C DIR/C . -> . WORLD/C)]\n   [world->world (WORLD/C . -> . WORLD/C)])\n  (require (submod \"..\" data) (submod \"..\" const) (submod \"..\" motion-help))\n  ;; world->world : World -> World\n  (define (world->world w)\n    (cond [(eating? w) (snake-eat w)]\n          [else\n           (world (snake-slither (world-snake w))\n                  (world-food w))]))\n  ;; eating? : World -> Boolean\n  ;; Is the snake eating the food in the world.\n  (define (eating? w)\n    (posn=? (world-food w)\n            (car (snake-segs (world-snake w)))))\n  ;; snake-change-direction : Snake Direction -> Snake\n  ;; Change the direction of the snake.\n  (define (snake-change-direction snk dir)\n    (snake dir\n           (snake-segs snk)))\n  ;; world-change-dir : World Direction -> World\n  ;; Change direction of the world.\n  (define (world-change-dir w dir)\n    (world (snake-change-direction (world-snake w) dir)\n           (world-food w)))\n  ;; snake-eat : World -> World\n  ;; Eat the food and generate a new one.\n  (define (snake-eat w)\n    (world (snake-grow (world-snake w))\n           #;(posn (random BOARD-WIDTH) (random BOARD-HEIGHT))\n           (posn (- BOARD-WIDTH 1) (- BOARD-HEIGHT 1)))))\n\n(module handlers racket\n  ;; Movie handlers\n  ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n  (provide/contract\n   [handle-key (WORLD/C string? . -> . WORLD/C)]\n   [game-over? (WORLD/C . -> . boolean?)])\n  (require (submod \"..\" data) (submod \"..\" motion) (submod \"..\" collide))\n  \n  ;; handle-key : World String -> World\n  (define (handle-key w ke)\n    (cond [(equal? ke \"w\") (world-change-dir w \"up\")]\n          [(equal? ke \"s\") (world-change-dir w \"down\")]\n          [(equal? ke \"a\") (world-change-dir w \"left\")]\n          [(equal? ke \"d\") (world-change-dir w \"right\")]\n          [else w]))\n  \n  ;; game-over? : World -> Boolean\n  (define (game-over? w)\n    (or (snake-wall-collide? (world-snake w))\n        (snake-self-collide? (world-snake w)))))\n(module scenes racket\n  \n  (provide/contract\n   [world->scene (WORLD/C . -> . image/c)]\n   [food+scene (POSN/C image/c . -> . image/c)]\n   [place-image-on-grid (image/c real? real? image/c . -> . image/c)]\n   [snake+scene (SNAKE/C image/c . -> . image/c)]\n   [segments+scene ((listof POSN/C) image/c . -> . image/c)]\n   [segment+scene (POSN/C image/c . -> . image/c)])\n  (require (submod \"..\" data) (submod \"..\" const) (submod \"..\" image))\n  \n  ;; world->scene : World -> Image\n  ;; Build an image of the given world.\n  (define (world->scene w)\n    (snake+scene (world-snake w)\n                 (food+scene (world-food w) (BACKGROUND))))\n  \n  ;; food+scene : Food Image -> Image\n  ;; Add image of food to the given scene.\n  (define (food+scene f scn)\n    (place-image-on-grid (FOOD-IMAGE) (posn-x f) (posn-y f) scn))\n  \n  ;; place-image-on-grid : Image Number Number Image -> Image\n  ;; Just like PLACE-IMAGE, but use grid coordinates.\n  (define (place-image-on-grid img x y scn)\n    (place-image img\n                 (* GRID-SIZE x)\n                 (- (BOARD-HEIGHT-PIXELS) (* GRID-SIZE y))\n                 scn))\n  \n  ;; snake+scene : Snake Image -> Image\n  ;; Add an image of the snake to the scene.\n  (define (snake+scene snk scn)\n    (segments+scene (snake-segs snk) scn))\n  \n  ;; segments+scene : Segs Image -> Image\n  ;; Add an image of the snake segments to the scene.\n  (define (segments+scene segs scn)\n    (cond [(empty? segs) scn]\n          [else (segments+scene (cdr segs) ;; tail recursion\n                                (segment+scene (car segs) scn))]))\n  \n  ;; segment+scene : Posn Image -> Image\n  ;; Add one snake segment to a scene.\n  (define (segment+scene seg scn)\n    (place-image-on-grid (SEGMENT-IMAGE) (posn-x seg) (posn-y seg) scn)))\n\n(require 'image 'data 'const 'collide 'cut-tail 'motion-help 'motion 'handlers 'scenes)\n(amb\n (snake-wall-collide? •)\n (snake-self-collide? •)\n (WORLD)\n (BACKGROUND)\n (FOOD-IMAGE)\n (SEGMENT-IMAGE)\n GRID-SIZE\n (BOARD-HEIGHT-PIXELS)\n BOARD-WIDTH\n BOARD-HEIGHT\n (cut-tail •)\n (posn • •)\n (posn? •)\n (posn-x •)\n (posn-y •)\n (posn=? • •)\n (snake • •)\n (snake? •)\n (snake-dir •)\n (snake-segs •)\n (world • •)\n (world? •)\n (world-snake •)\n (world-food •)\n (game-over? •)\n (handle-key • •)\n (snake-slither •)\n (snake-grow •)\n (world->world •)\n (world-change-dir • •)\n (world->scene •)\n (food+scene • •)\n (place-image-on-grid • • • •)\n (snake+scene • •)\n (segments+scene • •)\n (segment+scene • •))\n\n"
,
safe_all:"(module all racket\n  (provide/contract [all ((any/c . -> . any/c) (listof any/c) . -> . any/c)])\n  (define (all p? xs)\n    (cond\n      [(empty? xs) #t]\n      [(empty? (cdr xs)) (p? (car xs))]\n      [else (and (p? (car xs)) (all p? (cdr xs)))])))\n\n(require 'all)\n(all • •)\n\n"
,
safe_sat_7:"(module sat racket\n  (provide/contract\n   [sat-solve-7\n    ((boolean? boolean? boolean? boolean? boolean? boolean? boolean? . -> . boolean?) . -> . boolean?)])\n  \n  (define (try f)\n    (or (f #t) (f #f)))\n  \n  (define (sat-solve-7 p)\n    (try (λ (n1)\n           (try (λ (n2)\n                  (try (λ (n3)\n                         (try (λ (n4)\n                                (try (λ (n5)\n                                       (try (λ (n6)\n                                              (try (λ (n7)\n                                                     (p n1 n2 n3 n4 n5 n6 n7)))))))))))))))))\n(module φ racket\n  (provide/contract\n   [φ (boolean? boolean? boolean? boolean? boolean? boolean? boolean? . -> . boolean?)]))\n\n(require 'sat 'φ)\n(sat-solve-7 φ)\n\n"
,
safe_intro2:"(module f racket\n  (provide/contract [f (integer? (integer? . -> . any/c) . -> . any/c)])\n  (define (f x g) (g (+ x 1))))\n(module h racket\n  (provide/contract [h ((and/c integer? (>/c 0)) . -> . any/c)])\n  (define (h y) 'unit))\n(module main racket\n  (provide/contract [main (integer? . -> . any/c)])\n  (require (submod \"..\" f) (submod \"..\" h))\n  (define (main n)\n    (if (>= n 0) (f n h) 'unit)))\n\n(require 'main)\n(main •)\n\n"
,
safe_foldl:"(module foldl racket\n  (provide/contract\n   [foldl ((any/c any/c . -> . any/c) any/c (listof any/c) . -> . any/c)])\n  (define (foldl f z xs)\n    (if (empty? xs) z\n        (foldl f (f (car xs) z) (cdr xs)))))\n\n(require 'foldl)\n(foldl • • •)\n\n"
,
safe_ex_03:"(module lib racket\n  (provide/contract [member (any/c (listof any/c) . -> . (or/c false? (nelistof any/c)))]))\n(module ex-03 racket\n  (provide/contract [f (any/c (listof any/c) . -> . false?)])\n  (require (submod \"..\" lib))\n  (define (f v l)\n    (let ([x (member v l)])\n      (if x (false? f) #f))))\n(require 'ex-03 'lib)\n(f • •)\n\n"
,
safe_terauchi_sum_all:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (sum x) (if (<= x 0) 0 (+ x (sum (- x 1)))))\n  (define (h y) (assert (<= y (sum y))))\n  (define (main) (h 0)))\n\n(require 'm)\n(main)\n\n"
,
safe_ack:"(module ack racket\n  (provide/contract [ack (integer? integer? . -> . integer?)])\n  (define (ack m n)\n    (cond\n      [(= m 0) (+ n 1)]\n      [(= n 0) (ack (- m 1) 1)]\n      [else (ack (- m 1) (ack m (- n 1)))])))\n\n(require 'ack)\n(ack • •)\n\n"
,
safe_hrec:"(module hrec racket\n  (provide/contract [f ((integer? . -> . integer?) integer? . -> . integer?)]\n           [main (integer? . -> . (and/c integer? (>=/c 0)))])\n  (define (f g x)\n    (if (>= x 0) (g x) (f (λ (x) (f g x)) (g x))))\n  (define (main n)\n    (f add1 n)))\n\n(require 'hrec)\n(main •)\n\n"
,
safe_id_dependent:"(module opaque racket\n  (provide/contract [n real?]))\n\n(module id racket\n  (provide/contract [f (->i ([x real?]) (res (x) (=/c x)))])\n  (define (f x) x))\n\n(require 'opaque 'id)\n(f n)\n\n"
,
safe_ex_04:"(module f racket\n  (provide/contract [f ((or/c string? number?) . -> . number?)])\n  (define (f x)\n    (if (number? x) (add1 x) (string-length x))))\n\n(module g racket\n  (provide/contract [g (any/c . -> . number?)])\n  (require (submod \"..\" f))\n  (define (g x)\n    (if (or (number? x) (string? x)) (f x) 0)))\n\n(require 'g)\n(g •)\n\n"
,
safe_fhnhn:"(module f racket\n  (provide/contract [f (->i ([x (any/c . -> . integer?)])\n\t\t   (res (x)\n\t\t\t((and/c (any/c . -> . integer?)\n\t\t\t\t(λ (y) (not (and (> (x #f) 0) (< (y #f) 0))))) . -> . integer?)))]))\n\n(module h racket\n  (provide/contract [h (integer? . -> . (any/c . -> . integer?))])\n  (define (h x) (λ (_) x)))\n\n(module g racket\n  (provide/contract [g (integer? . -> . integer?)])\n  (require (submod \"..\" f) (submod \"..\" h))\n  (define (g n) ((f (h n)) (h n))))\n\n(module main racket\n  (provide/contract [main (integer? . -> . integer?)])\n  (require (submod \"..\" g))\n  (define (main m) (g m)))\n\n(require 'main)\n(main •)\n\n"
,
safe_foldr1:"(module foldr1 racket\n  (provide/contract [foldr1 ((any/c any/c . -> . any/c) (nelistof any/c) . -> . any/c)])\n  (define (foldr1 f xs)\n    (let ([z (car xs)]\n          [zs (cdr xs)])\n      (if (empty? zs) z\n          (f z (foldr1 f zs))))))\n\n(require 'foldr1)\n(foldr1 • •)\n\n"
,
safe_reverse_dep:"(module reverse-dep racket\n  (provide/contract\n   [reverse (->i ([xs (listof any/c)])\n\t\t (res (xs)\n\t\t      (and/c (listof any/c)\n\t\t\t     (λ (ys) (equal? (empty? xs) (empty? ys))))))]\n   [append ((listof any/c) (listof any/c) . -> . (listof any/c))])\n  (define (append xs ys)\n    (if (empty? xs) ys\n        (cons (car xs) (append (cdr xs) ys))))\n  (define (reverse xs)\n    (if (empty? xs) empty\n        (append (cdr xs) (cons (car xs) empty)))))\n\n(require 'reverse-dep)\n(reverse •)\n\n"
,
safe_ex_07:"(module f racket\n  (provide/contract [f (any/c any/c . -> . number?)])\n  (define (f x y)\n    (if (if (number? x) (string? y) #f)\n        (+ x (string-length y))\n        0)))\n\n(require 'f)\n(f • •)\n\n"
,
safe_ex_09:"(module f racket\n  (provide/contract [f ((or/c string? number?) . -> . number?)])\n  (define (f x)\n    (if (number? x) (add1 x) (string-length x))))\n\n(module g racket\n  (provide/contract [g (any/c . -> . number?)])\n  (require (submod \"..\" f))\n  (define (g x)\n    (if (let ([tmp (number? x)])\n          (if tmp tmp (string? x)))\n        (f x)\n        0)))\n\n(require 'g)\n(g •)\n\n"
,
safe_terauchi_sum_acm:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (sum x y k)\n    (if (<= x 0) (k y) (sum (- x 1) (+ x y) k)))\n  (define (check x) (assert (<= 100 x)))\n  (define (main) (sum 100 0 check)))\n\n(require 'm)\n(main)\n\n"
,
safe_factorial:"(module factorial racket\n  (provide/contract\n   [factorial (integer? . -> . integer?)])\n  (define (factorial n)\n    (if (zero? n) 1 (* n (factorial (sub1 n))))))\n\n(require 'factorial)\n(factorial •)\n\n"
,
safe_get_path:"(module lib racket\n  (provide/contract\n   [path/c any/c]\n   [dom/c any/c])\n  (define path/c\n    (->i ([msg (one-of/c \"hd\" \"tl\")])\n\t (res (msg)\n\t      (cond\n\t       [(equal? msg \"hd\") string?]\n\t       [else (or/c false? path/c)]))))\n  (define dom/c\n    (-> (one-of/c \"get-child\") (string? . -> . dom/c))))\n\n(module get-path racket\n  (provide/contract [get-path (dom/c path/c . -> . dom/c)])\n  (require (submod \"..\" lib))\n  (define (get-path root p)\n    (while root p))\n  (define (while cur path)\n    (if (and (not (false? path)) (not (false? cur)))\n        (while ((cur \"get-child\") (path \"hd\"))\n               (path \"tl\"))\n        cur)))\n\n(require 'get-path)\n(get-path • •)\n\n"
,
safe_r_file:"(module utils racket\n  (provide/contract [loop (any/c . -> . (λ (_) #f))]\n\t\t    [STATE/C any/c])\n  (define (loop x) (loop #f))\n  (define STATE/C (one-of/c 'init 'opened 'closed 'ignore)))\n\n(module read racket\n  (provide/contract\n   [readit ((one-of/c 'opened 'ignore) . -> . (one-of/c 'opened 'ignore))]\n   [read_ (any/c STATE/C . -> . STATE/C)])\n  (require (submod \"..\" utils))\n  (define (readit st)\n    (if (equal? 'opened st) 'opened 'ignore))\n  (define (read_ x st)\n    (if x (readit st) st)))\n\n(module close racket\n  (provide/contract\n   [closeit (STATE/C . -> . (one-of/c 'closed 'ignore))]\n   [close_ (any/c STATE/C . -> . STATE/C)])\n  (require (submod \"..\" utils))\n  (define (closeit st)\n    (cond\n      [(equal? 'opened st) 'closed]\n      [(equal? 'ignore st) 'ignore]\n      [else (begin (loop #f) 0)]))\n  (define (close_ x st)\n    (if x (closeit st) st)))\n\n(module f racket\n  (provide/contract [f (any/c any/c STATE/C . -> . any/c)])\n  (require (submod \"..\" read) (submod \"..\" close) (submod \"..\" utils))\n  (define (f x y st)\n    (begin (close_ y (close_ x st))\n           (f x y (read_ y (read_ x st))))))\n\n(module next racket\n  (provide/contract [next (STATE/C . -> . STATE/C)])\n  (require (submod \"..\" utils))\n  (define (next st) (if (equal? 'init st) 'opened 'ignore)))\n\n(module g racket\n  (provide/contract [g (integer? any/c STATE/C . -> . any/c)])\n  (require (submod \"..\" f) (submod \"..\" next) (submod \"..\" utils))\n  (define (g b3 x st)\n    (if (> b3 0) (f x #t (next st)) (f x #f st))))\n\n(module main racket\n  (provide/contract [main (integer? integer? . -> . any/c)])\n  (require (submod \"..\" g) (submod \"..\" utils))\n  (define (main b2 b3)\n    (begin\n      (if (> b2 0) (g b3 #t 'opened) (g b3 #f 'init))\n      'unit)))\n\n(require 'main)\n(main • •)\n\n"
,
safe_fold_fun_list:"(module fold-fun-list racket\n  (provide/contract\n   [mk-list (integer? . -> . (listof (integer? . -> . integer?)))]\n   [foldr (((integer? . -> . integer?) (integer? . -> . integer?) . -> . (integer? . -> . integer?))\n           (integer? . -> . integer?)\n           (listof (integer? . -> . integer?))\n           . -> . (integer? . -> . integer?))]\n   [main (->i ([n integer?])\n\t      (res (n) (and/c (integer? . -> . integer?) (λ (f) (>= (f 0) 0)))))])\n  (define (mk-list n)\n    (if (<= n 0) empty\n        (cons (λ (m) (+ m n)) (mk-list (- n 1)))))\n  (define (foldr f z xs)\n    (if (empty? xs) z (f (car xs) (foldr f z (cdr xs)))))\n  (define (compose f g) (λ (x) (f (g x))))\n  (define (main n)\n    (let ([xs (mk-list n)])\n      (foldr compose (λ (x) x) xs))))\n\n(require 'fold-fun-list)\n(main •)\n\n"
,
safe_ex_14:"(module f racket\n  (provide/contract\n   [f ([or/c number? string?] cons? . -> . number?)])\n  (define (f input extra)\n    (cond\n      [(and (number? input) (number? (car extra)))\n       (+ input (car extra))]\n      [(number? (car extra))\n       (+ (string-length input) (car extra))]\n      [else 0])))\n\n(require 'f)\n(f • •)\n\n"
,
safe_ex_08:"(module strnum? racket\n  (provide/contract [strnum? (->i ([x any/c]) (res (x) (and/c boolean? (λ (a) (equal? a (or (string? x) (number? x)))))))])\n  (define (strnum? x)\n    (or (string? x) (number? x))))\n\n(require 'strnum?)\n(strnum? •)\n\n"
,
safe_terauchi_sum:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (sum x) (if (<= x 0) 0 (+ x (sum (- x 1)))))\n  (define (main) (assert (<= 100 (sum 100)))))\n\n(require 'm)\n(main)\n\n"
,
safe_mutual_cons:"(module m racket\n  (provide/contract [f (integer? . -> . any/c)])\n  (define (f x)\n    (if (= x 0) #f (cons x (g (- x 1)))))\n  (define (g x)\n    (if (= x 0) #t (cons x (f (- x 1))))))\n(require 'm)\n(f •)\n\n"
,
safe_r_lock:"(module lock racket\n  (provide/contract [lock ((one-of/c 0) . -> . (one-of/c 1))]\n           [unlock ((one-of/c 1) . -> . (one-of/c 0))])\n  (define (lock st) 1)\n  (define (unlock st) 0))\n\n(module fg racket\n  (provide/contract [f (integer? integer? . -> . integer?)]\n           [g (integer? integer? . -> . integer?)])\n  (require (submod \"..\" lock))\n  (define (f n st) (if (> n 0) (lock st) st))\n  (define (g n st) (if (> n 0) (unlock st) st)))\n\n(module main racket\n  (provide/contract [main (integer? . -> . (one-of/c 0))])\n  (require (submod \"..\" fg))\n  (define (main n) (g n (f n 0))))\n\n(require 'main)\n(main •)\n\n"
,
safe_onto:"(module onto racket\n  (provide/contract\n   [onto (->i ([A (any/c . -> . boolean?)]) ; poor man's quantifier\n\t      (res (A)\n\t\t   (->i ([callbacks (listof procedure?)])\n\t\t\t(res (callbacks)\n\t\t\t     (->i ([f (or/c false? string? (A . -> . any/c))])\n\t\t\t\t  (res (f)\n\t\t\t\t       (->i ([obj (and/c\n\t\t\t\t\t\t   A\n\t\t\t\t\t\t   (cond\n\t\t\t\t\t\t    [(false? f) (any/c . -> . any/c)]\n\t\t\t\t\t\t    [(string? f) (->i ([k any/c]) (res (k) (if (equal? k f) (A . -> . any/c) any/c)))]\n\t\t\t\t\t\t    [else any/c]))])\n\t\t\t\t\t    (res (obj) (listof procedure?)))))))))])\n  (define (onto A)\n    (λ (callbacks)\n      (λ (f)\n        (λ (obj)\n          (if (false? f) (cons obj callbacks)\n              (let ([cb (if (string? f) (obj f) f)])\n                (cons (λ () (cb obj)) callbacks))))))))\n\n(require 'onto)\n((((onto •) •) •) •)\n\n"
,
safe_repeat:"(module repeat racket\n  (provide/contract\n   [repeat (->i ([f (any/c . -> . any/c)] [n integer?] [s any/c])\n\t\t(res (f n s) (λ (a) (implies (= n 0) (equal? a s)))))])\n  (define (repeat f n s)\n    (if (= n 0) s (f (repeat f (- n 1) s)))))\n\n(require 'repeat)\n(repeat • • •)\n\n"
,
safe_terauchi_mult_all:"(module assert racket (provide/contract [assert ((not/c false?) . -> . any/c)]))\n\n(module m racket\n  (provide/contract [main (-> any/c)])\n  (require (submod \"..\" assert))\n  (define (mult x y)\n    (if (or (<= x 0) (<= y 0)) 0 (+ x (mult x (- y 1)))))\n  (define (h y) (assert (<= y (mult y y))))\n  (define (main) (h 0)))\n\n(require 'm)\n(main)\n\n"
,
safe_maybe_apply_negate:"(module negate racket\n  (provide/contract [negate ((or/c integer? boolean?) . -> . (or/c integer? boolean?))])\n  (define (negate x)\n    (if (integer? x) (- 0 x) (not x))))\n\n(module maybe-apply racket\n  (provide/contract [maybe-apply (integer? (or/c false? (integer? . -> . integer?)) . -> . integer?)])\n  (define (maybe-apply x f)\n    (if (false? f) x (f x))))\n\n(module opaque racket (provide/contract [n integer?]))\n\n(module main racket\n  (provide/contract [main (-> integer?)])\n  (require (submod \"..\" maybe-apply) (submod \"..\" negate) (submod \"..\" opaque))\n  (define (main)\n    (maybe-apply n negate)))\n\n(require 'negate 'maybe-apply 'main)\n(amb (negate •) (maybe-apply • •) (main))\n\n"
,
safe_intro1:"(module f racket\n  (provide/contract [f (integer? (integer? . -> . any/c) . -> . any/c)])\n  (define (f x g) (g (+ x 1))))\n(module h racket\n  (provide/contract [h ((and/c integer? (>/c 0)) . -> . any/c)])\n  (define (h y) 'unit))\n(module main racket\n  (provide/contract [main (integer? . -> . any/c)])\n  (require (submod \"..\" f) (submod \"..\" h))\n  (define (main n)\n    (if (> n 0) (f n h) 'unit)))\n\n(require 'main)\n(main •)\n\n"
,
safe_length:"(module len racket\n  (provide/contract\n   [len (->i ([l (listof any/c)]) (res (l) (and/c integer? (>=/c 0))))])\n\n  (define (len xs)\n    (if (empty? xs) 0\n        (+ 1 (len (cdr xs))))))\n\n(require 'len)\n(len •)\n\n"
,
safe_weighted_avg:"(module weighted-avg racket\n  (provide/contract\n   [weighted-avg (->i ([x (nelistof real?)])\n\t\t      (res (x) ((and/c (nelistof positive?) (λ (w) (= (len x) (len w))))\n\t\t\t\t. -> . real?)))])\n  (define (weighted-avg x)\n    (λ (w)\n      (let* ([x@ (list@ x)]\n             [w@ (list@ w)]\n             [b (cons (* (x@ 0) (w@ 0)) (w@ 0))]\n             [f (λ (i s×n) (cons (+ (car s×n) (* (x@ i) (w@ i))) (+ (cdr s×n) (w@ i))))]\n             [sum×n ((foldn 1 (len x) b) f)])\n        (/ (car sum×n) (cdr sum×n)))))\n  (define (foldn m n b)\n    (λ (g) (if (< m n) ((foldn (+ m 1) n (g m b)) g) b)))\n  (define (list@ xs)\n    (λ (i) (if (zero? i) (car xs) ((list@ (cdr xs)) (- i 1)))))\n  (define (len l) (if (empty? l) 0 (+ 1 (len (cdr l))))))\n\n(require 'weighted-avg)\n((weighted-avg (list 10 15 20)) (list 1 1 1))\n\n"
,
safe_append:"(module append racket\n  (provide/contract\n   [append ((listof any/c) (listof any/c) . -> . (listof any/c))])\n  (define (append xs ys)\n    (if (empty? xs) ys\n        (cons (car xs) (append (cdr xs) ys)))))\n\n(require 'append)\n(append • •)\n\n"
,
safe_ex_10:"(module f racket\n  (provide/contract [f (cons? . -> . number?)])\n  (define (f p)\n    (if (number? (car p)) (add1 (car p)) 7)))\n\n(require 'f)\n(f •)\n\n"
,
safe_inc_or_greet:"(module lib racket\n  (provide/contract [string-append (string? string? . -> . string?)]))\n\n(module inc-or-greet racket\n  (provide/contract [inc-or-greet (boolean? (or/c string? integer?) . -> . (or/c false? integer? string?))])\n  (require (submod \"..\" lib))\n  (define (inc-or-greet mode y)\n    (if mode\n        (if (integer? y) (+ y 1) #f)\n        (if (string? y) (string-append \"Hello\" y) #f))))\n\n(require 'inc-or-greet)\n(inc-or-greet • •)\n\n"
,
safe_isnil:"(module isnil racket\n  (provide/contract [mk-list (->i ([n integer?])\n\t\t\t (res (n)\n\t\t\t      (and/c (listof integer?)\n\t\t\t\t     (λ (l) (implies (> n 0) (cons? l))))))])\n  (define (mk-list n)\n    (if (= n 0) empty (cons n (mk-list (- n 1))))))\n(require 'isnil)\n(mk-list •)\n\n"
,
safe_map_foldr:"(module map-foldr racket\n  (provide/contract\n   [foldr ((any/c any/c . -> . any/c) any/c (listof any/c) . -> . any/c)]\n   [map ((any/c . -> . any/c) (listof any/c) . -> . (listof any/c))])\n  (define (foldr f z xs)\n    (if (empty? xs) z\n        (f (car xs) (foldr f z (cdr xs)))))\n  (define (map f xs)\n    (foldr (λ (x ys) (cons (f x) ys)) empty xs)))\n\n(require 'map-foldr)\n(map • •)\n\n"
,
safe_ex_01:"(module f racket\n  (provide/contract [f (any/c . -> . number?)])\n  (define (f x)\n    (if (number? x) (add1 x) 0)))\n\n(require 'f)\n(f •)\n\n"
,
safe_hors:"(module c racket\n  (provide/contract [c (integer? . -> . any/c)])\n  (define (c _) 'unit))\n\n(module b racket\n  (provide/contract [b ((integer? . -> . any/c) integer? . -> . any/c)])\n  (define (b x _) (x 1)))\n\n(module a racket\n  (provide/contract [a ((integer? . -> . any/c) (integer? . -> . any/c) zero? . -> . any/c)])\n  (define (a x y q) (begin (x 0) (y 0))))\n\n(module f racket\n  (provide/contract [f (integer? (integer? . -> . any/c) integer? . -> . any/c)])\n  (require (submod \"..\" a) (submod \"..\" b))\n  (define (f n x q)\n    (if (<= n 0) (x q)\n        (a x (λ (p) (f (- n 1) (λ (_) (b x _)) p)) q))))\n\n(module s racket\n  (provide/contract [s (integer? integer? . -> . any/c)])\n  (require (submod \"..\" c) (submod \"..\" f))\n  (define (s n q) (f n c q)))\n\n(module main racket\n  (provide/contract [main (integer? . -> . any/c)])\n  (require (submod \"..\" s))\n  (define (main n) (s n 0)))\n\n(require 'main)\n(main •)\n\n"
,
safe_mult:"(module mult racket\n  (provide/contract [mult (integer? integer? . -> . (and/c integer? (>=/c 0)))]\n\t\t    [sqr (->i ([n integer?]) (res (n) (and/c integer? (>=/c n))))])\n  (define (mult n m)\n    (if (or (<= n 0) (<= m 0)) 0\n        (+ n (mult n (- m 1)))))\n  (define (sqr n) (mult n n)))\n\n(require 'mult)\n(sqr •)\n\n"
,
safe_tree_depth:"(module tree-depth racket\n  (provide/contract\n   [depth (TREE/C . -> . (and/c integer? (>=/c 0)))]\n   [TREE/C any/c])\n  (struct leaf ())\n  (struct node (l r))\n  (define (depth t)\n    (if (node? t) (+ 1 (max (depth (node-l t)) (depth (node-r t)))) 0))\n  (define (max x y) (if (> x y) x y))\n  (define TREE/C (μ/c (X) (or/c (struct/c leaf) (struct/c node X X)))))\n\n(require 'tree-depth)\n(depth •)\n\n"
,
safe_reverse:"(module main racket\n  (provide/contract [main (integer? . -> . integer?)])\n  (define (main len)\n    (let ([xs (mk-list len)])\n      (if (not (= len 0)) (car (reverse xs empty)) 0)))\n  \n  (define (reverse l ac)\n    (if (empty? l) ac (reverse (cdr l) (cons (car l) ac))))\n  \n  (define (mk-list n)\n    (if (= n 0) empty (cons n (mk-list (- n 1))))))\n\n(require 'main)\n(main •)\n\n"
,
safe_tak:"(module tak racket\n  (provide/contract\n   [tak (integer? integer? integer? . -> . integer?)])\n  (define (tak x y z)\n    (if (false? (< y x)) z\n        (tak (tak (- x 1) y z)\n             (tak (- y 1) z x)\n             (tak (- z 1) x y)))))\n(module nums racket\n  (provide/contract [a integer?] [b integer?] [c integer?]))\n\n(require 'tak 'nums)\n(tak a b c)\n\n"
,
safe_insertion_sort:"(module opaque racket\n  (provide/contract [insert (integer? SORTED/C . -> . (and/c (nelistof integer?) ne-sorted?))]\n           [ne-sorted? ((nelistof integer?) . -> . boolean?)]\n           [SORTED/C any/c])\n  (define SORTED/C (or/c empty? (and/c (nelistof integer?) ne-sorted?))))\n\n(module insertion-sort racket\n  (require (submod \"..\" opaque))\n  (provide/contract\n   [sort (->i ([l (listof integer?)]) (res (l) (and/c SORTED/C (λ (r) (if (empty? l) (empty? r) (cons? r))))))])\n  (define (sort xs) (foldl insert xs empty))\n  (define (foldl f l b)\n    (if (empty? l) b (foldl f (cdr l) (f (car l) b)))))\n\n(require 'insertion-sort)\n(sort •)\n\n"
}



var example_texts = {
  argmin_unsafe: "The unsafe argmin example shows a case that involves constructing a higher-order counterexample.  According to its contract, the argmin function consumes a unary function that produces a number and a (non-empty) list of numbers.  Its purpose is to produce the element of the list that minimizes the output of the function. The problem is that computing the minimum of two numbers is not always well-defined since complex numbers are not comparable.  This case occurs when (a) the list of numbers contains at least two elements and (b) the function produces a complex number.  In this instance, the contract given for argmin is erroneous, it should require its functional argument to produce /real/ numbers rather than (arbitrary) numbers.",

  argmin_safe: "The safe argmin example changes number? to real? in the contract for argmin, making it safe.",

  braun_tree: "The braun_tree example shows a failure to maintain the Braun tree's invariant by not swapping the two branches when inserting.",

  div100: "The div100 example shows a simple case of providing a numeric counterexample.  The contract for f states it takes integers and produces integers, but its implementation divides one over 100 minus the argument to the function.  There are two things wrong with this: (a) the program could produce a divide-by-zero error if the argument is 100, (b) the result might not be an integer in some cases such as the argument being 1.",

  dynamic_tests: "The dynamic_tests example is a safe program that demonstrates the verification engines ability to reason through conditional control flow.",

  foldl1: "The foldl1 example finds a bug in a shoddy version of foldl that tries to deconstruct a pair without first ensuring the input is not empty.",

  get_path: "The get_path example shows a functional encoding of an object with two fields \"hd\" and \"tl\". In this case, the function accesses the wrong field, resulting in an error.",

  last: "The last example shows a counterexample for the function that computes the last element of a list.  In this case, the contract is incorrect because it doesn't require the input list to be non-empty.  The interesting aspect of this example is that the recursive last function is written using the Y-combinator, but this poses no problem for the verification engine.",

  last_pair: "The last_pair example involves a lastpair function with the contract stating it consumes and produces pairs.  The problem is that if the input is an improper list (a list not terminating in empty), then the lastpair function does not produces a pair.",

  fact: "Standard factorial example.",

  ext: "This example shows that functions are assumed to be pure.  On equal inputs, a function produces equal outputs.",
  
  dependent: "This example shows a simple use of dependent contracts.",


fail_ce_flatten:"Test"
,
fail_ce_foldr:"Test"
,
fail_ce_recip:"Test"
,
fail_ce_tetris:"Test"
,
fail_ce_last:"Test"
,
fail_ce_mem:"Test"
,
fail_ce_foldl1:"Test"
,
fail_ce_last_pair:"Test"
,
fail_ce_fold_div:"Test"
,
fail_ce_argmin:"Test"
,
fail_ce_member:"Test"
,
fail_ce_snake:"Test"
,
fail_ce_all:"Test"
,
fail_ce_foldl:"Test"
,
fail_ce_ack:"Test"
,
fail_ce_id_dependent:"Test"
,
fail_ce_zombie:"Test"
,
fail_ce_foldr1:"Test"
,
fail_ce_sum:"Test"
,
fail_ce_get_path:"Test"
,
fail_ce_l_zipunzip:"Test"
,
fail_ce_braun_tree:"Test"
,
fail_ce_append:"Test"
,
fail_ce_inc_or_greet:"Test"
,
fail_ce_l_zipmap:"Test"
,
safe_recursive_div2:"Test"
,
safe_length_acc:"Test"
,
safe_recip:"Test"
,
safe_ex_11:"Test"
,
safe_sum_filter:"Test"
,
safe_filter:"Test"
,
safe_dvh_3:"Test"
,
safe_ex_06:"Test"
,
safe_terauchi_mult:"Test"
,
safe_incf:"Test"
,
safe_flatten:"Test"
,
safe_nth0:"Test"
,
safe_ex_12:"Test"
,
safe_foldr:"Test"
,
safe_recip_contract:"Test"
,
safe_tetris:"Test"
,
safe_ex_02:"Test"
,
safe_dvh_2:"Test"
,
safe_ho_opaque:"Test"
,
safe_last:"Test"
,
safe_mem:"Test"
,
safe_tricky:"Test"
,
safe_rsa:"Test"
,
safe_ex_05:"Test"
,
safe_foldl1:"Test"
,
safe_ex_13:"Test"
,
safe_map:"Test"
,
safe_mini_church:"Test"
,
safe_last_pair:"Test"
,
safe_fold_div:"Test"
,
safe_terauchi_mult_cps:"Test"
,
safe_guess:"Test"
,
safe_factorial_acc:"Test"
,
safe_even_odd:"Test"
,
safe_terauchi_boolflip:"Test"
,
safe_subst:"Test"
,
safe_cpstak:"Test"
,
safe_taut:"Test"
,
safe_mappend:"Test"
,
safe_intro3:"Test"
,
safe_fibonacci:"Test"
,
safe_max:"Test"
,
safe_neg:"Test"
,
safe_member:"Test"
,
safe_dvh_1:"Test"
,
safe_snake:"Test"
,
safe_all:"Test"
,
safe_sat_7:"Test"
,
safe_intro2:"Test"
,
safe_foldl:"Test"
,
safe_ex_03:"Test"
,
safe_terauchi_sum_all:"Test"
,
safe_ack:"Test"
,
safe_hrec:"Test"
,
safe_id_dependent:"Test"
,
safe_ex_04:"Test"
,
safe_fhnhn:"Test"
,
safe_foldr1:"Test"
,
safe_reverse_dep:"Test"
,
safe_ex_07:"Test"
,
safe_ex_09:"Test"
,
safe_terauchi_sum_acm:"Test"
,
safe_factorial:"Test"
,
safe_get_path:"Test"
,
safe_r_file:"Test"
,
safe_fold_fun_list:"Test"
,
safe_ex_14:"Test"
,
safe_ex_08:"Test"
,
safe_terauchi_sum:"Test"
,
safe_mutual_cons:"Test"
,
safe_r_lock:"Test"
,
safe_onto:"Test"
,
safe_repeat:"Test"
,
safe_terauchi_mult_all:"Test"
,
safe_maybe_apply_negate:"Test"
,
safe_intro1:"Test"
,
safe_length:"Test"
,
safe_weighted_avg:"Test"
,
safe_append:"Test"
,
safe_ex_10:"Test"
,
safe_inc_or_greet:"Test"
,
safe_isnil:"Test"
,
safe_map_foldr:"Test"
,
safe_ex_01:"Test"
,
safe_hors:"Test"
,
safe_mult:"Test"
,
safe_tree_depth:"Test"
,
safe_reverse:"Test"
,
safe_tak:"Test"
,
safe_insertion_sort:"Test"
}

