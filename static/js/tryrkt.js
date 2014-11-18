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

function check() {
    var results = eval_racket(document.getElementById("console").value);
    console.log(results);
    onResults(results);
}

function onResults(results) {
    var changer = document.getElementById("changer_result");
    log("Changer", changer);
    while (changer.firstChild) {
	changer.removeChild(changer.firstChild);
    }
    log("Results", results);
    for (var i in results) {
	appendResult(changer, results[i]);
    }
    console.log(changer);
}

function appendResult(changer, result) {
    log("Result", result);
    if (result.result) {
	console.log(result.result);
	changer.appendChild(createP(result.result, "value"));
    } else if (result.error) {
	console.log(result.message);
	changer.appendChild(createP(result.message, "error"));
    }
    console.log(changer);
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

function log(label, content) {
    console.log(label + ": ");
    console.log(content);
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
	if (data.error) {
	    results.push({msg: data.message, className: "jquery-console-message-error"});
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
