var examples = {
  argmin: "(module min racket\
\n  (provide (contract-out [min (real? real? . -> . real?)]))\
\n  (define (min x y)\
\n    (if (< x y) x y)))\
\n\
\n(module argmin racket\
\n  (provide (contract-out [argmin ((-> any/c number?) (cons/c any/c (listof any/c)) . -> . any/c)]))\
\n  (require (submod \"..\" min))\
\n  (define (argmin f xs)\
\n    (cond [(empty? (cdr xs)) (f (car xs))]\
\n    [else (min (f (car xs))\
\n           (argmin f (cdr xs)))])))",

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
\n  (and (node? x)\
\n       (braun-tree? (node-l x))\
\n       (braun-tree? (node-r x))\
\n       (let ([l (size (node-l x))]\
\n         [r (size (node-r x))])\
\n         (or (= l r) (= l (add1 r)))))))\
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
\n  (provide (contract-out [foldl1 ((any/c any/c . -> . any/c) (listof any/c) . -> . any/c)]))\
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
\n    [Y (([any/c . -> . any/c] . -> . [any/c . -> . any/c]) . -> . [any/c . -> . any/c])]))\
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
\n    (if (cons? x) (lastpair (cdr x)) x)))"
}

var example_texts = {
  argmin: "The argmin example shows a case that involves constructing a higher-order counterexample.  According to its contract, the argmin function consumes a unary function that produces a number and a (non-empty) list of numbers.  Its purpose is to produce the element of the list that minimizes the output of the function. The problem is that computing the minimum of two numbers is not always well-defined since complex numbers are not comparable.  This case occurs when (a) the list of numbers contains at least two elements and (b) the function produces a complex number.  In this instance, the contract given for argmin is erroneous, it should require its functional argument to produce /real/ numbers rather than (arbitrary) numbers.",

  braun_tree:"The braun_tree example ...",

  div100: "The div100 example shows a simple case of providing a numeric counterexample.  The contract for f states it takes integers and produces integers, but its implementation divides one over 100 minus the argument to the function.  There are two things wrong with this: (a) the program could produce a divide-by-zero error if the argument is 100, (b) the result not be an integer in cases such as the argument being 1.",

  dynamic_tests: "The dynamic_tests example is a safe program that demonstrates the verification engines ability to reason through conditional control flow.",

  foldl1: "The foldl1 example finds a bug in a shoddy version of foldl that tries to deconstruct a pair without first ensuring the input is not empty.",

  get_path: "The get_path example...",

  last: "The last example shows a counterexample for the function that computes the last element of a list.  In this case, the contract is incorrect because it doesn't require the input list to be non-empty.  The interesting aspect of this example is that the recursive last function is written using the Y-combinator, but this poses no problem for the verification engine.",

  last_pair: "The last_pair example involves a lastpair function with the contract stating it consumes and produces pairs.  The problem is that if the input is an improper list (a list not terminating in empty), then the lastpair function does not produces a pair."
}

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
}

function copy() {
    document.getElementById("console").value = myCodeMirror.getValue();
}

/*var currentPage = -1;
var pages = [
            "intro",
            "go",
            "definitions",
            "binding",
            "functions",
            "scope",
            "lists",
            "modules",
            "macros",
            //"objects",
            "where",
      "end"
        ];
var pageExitConditions = [
    {
        verify: function(data) { return false; }
    },
    {
        verify: function(data) { return data.expr == "(hc-append (circle 10) (rectangle 10 20))"; }
    },
    {
        verify: function(data) { return data.expr == "(square 10)"; }
    },
    {
        verify: function(data) { return data.expr == "(checkerboard (square 10))"; }
    },
    {
        verify: function(data) { return false; }
    },
    {
        verify: function (data) { return false; }
    },
    {
        verify: function (data) { return false; }
    },
    {
        verify: function (data) { return false;}
    },
    {
        verify: function (data) { return false; }
    },
    {
        verify: function (data) { return false; }
    },
    {
        verify: function (data) { return false; }
    },
    {
        verify: function (data) { return false; }
    }
];

function goToPage(pageNumber) {
    if (pageNumber == currentPage || pageNumber < 0 || pageNumber >= pages.length) {
            return;
    }

    currentPage = pageNumber;

    var block = $("#changer");
    block.fadeOut(function(e) {
        block.load("/tutorial", { 'page' : pages[pageNumber] }, function() {
      block.fadeIn();
      changerUpdated();
        });
    });
}
*/
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


function eval_racket(code) {
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

function check() {
    setMessage("Verifying...", "timeout");
    console.log("About to verify");
    var results = eval_racket(document.getElementById("console").value);
    console.log("Results:");
    console.log(results);
    setResult(results[0]); // better be a singleton
}

function setResult(result) {
    console.log("Result:");
    console.log(result);
    if (result.result) {
    setMessage(result.result, "value");
    } else if (result.result === "") /*HACK*/ {
    setMessage("(Program run with no output)", "value");
    } else if (result.error) {
    setMessage(result.message, "error");
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

function createP(text, classs) {
    var p = document.createElement("div");
    var t = document.createTextNode(text);
    var a = document.createAttribute("class");
    a.value = classs;
    p.appendChild(t);
    p.setAttributeNode(a);
    return p;
}

/*function complete_racket(str){
    var data;
    $.ajax({
        url: evalUrl,
        data: { complete : str },
        async: false,
        success: function(res) { data = res; },
    });
    return data;
}*/

/*function doCommand(input) {
    console.log(input)
        if (input.match(/^gopage /)) {
                goToPage(parseInt(input.substring("gopage ".length)));
                return true;
        }

        switch (input) {
      case 'next':
      case 'forward':
            goToPage(currentPage + 1);
                return true;
        case 'previous':
        case 'prev':
        case 'back':
            goToPage(currentPage - 1);
                return true;
    case 'restart':
    case 'reset':
    case 'home':
    case 'quit':
            goToPage(0);
        return true;
    default:
        return false;
    }
}*/

function onValidate(input) {
    return (input != "");
}

function onComplete(line) {
    var input = $.trim(line);
    // get the prefix that won't be completed
    var prefix = line.replace(RegExp("(\\w|[-])*$"), "");
    var data = complete_racket(input);

    // handle error
    if (data.error) {
        controller.commandResult(data.message, "jquery-console-message-error");
        return [];
    }
    else {
        var res = JSON.parse(data.result);
        for (var i = 0; i<res.length; i++) {
            res[i] = prefix+res[i];
        }
        return res;
    }
}
    
/** This function is no longer used,
 but i'm leaving it uncommented for now cos it's referenced below */
function onHandle(line, report) {
    console.log("onHandle called");
    var input = $.trim(line);
    // handle commands
    /*if (doCommand(input)) {
            report();
            return;
        }*/
    // perform evaluation
    var datas = eval_racket(input);
    var results = [];

    // handle error
    for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    console.log(data);
    if (data.error) {
        results.push({msg: data.message, className: "jquery-console-message-error"});
    } else if (data.timeout) {
        results.push({msg: "Timeout.", className: "jquery-console-message-timeout"});
    } else if (data.safe) {
        results.push({msg: "Program is safe.", className: "jquery-console-message-value"});
    } else if (/#\"data:image\/png;base64,/.test(data.result)) {
            $('.jquery-console-inner').append('<img src="' + data.result.substring(2) + " />");
            controller.scrollToBottom();
        results.push({msg: "", className: "jquery-console-message-value"});
    } else {
        results.push({msg: data.result, className: "jquery-console-message-value"});
    }
    }
    
    // handle page (TODO disable for now, may need later)
    /*if (currentPage >= 0 && pageExitConditions[currentPage].verify(data)) {
            goToPage(currentPage + 1);
    }*/
    return results;
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

var controller;
$(document).ready(function() {
    controller = $("#console").console({
        welcomeMessage:'Make some SCPCF!',
        promptLabel: '>> ',
        commandValidate: onValidate,
        commandHandle: onHandle,
        completeHandle: onComplete,
        autofocus:true,
        animateScroll:true,
        promptHistory:false,
        cols:1
    });
    console.log(controller);
    //$("#about").click(setupLink("about"));
    //$("#links").click(setupLink("links"));
    changerUpdated();
});


function run() {
    setMessage("Running...", "timeout");
    console.log("About to verify");
    var results = run_racket(document.getElementById("console").value);
    console.log("Results:");
    console.log(results);
    setResult(results[0]); // better be a singleton
}
