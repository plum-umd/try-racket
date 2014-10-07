var currentPage = -1;
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

function complete_racket(str){
    var data;
    $.ajax({
        url: evalUrl,
        data: { complete : str },
        async: false,
        success: function(res) { data = res; },
    });
    return data;
}

function doCommand(input) {
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
}

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
    var input = $.trim(line);
    // handle commands
    if (doCommand(input)) {
			report();
			return;
		}
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
        promptLabel: '> ',
        commandValidate: onValidate,
        commandHandle: onHandle,
        completeHandle: onComplete,
        autofocus:true,
        animateScroll:true,
        promptHistory:true,
        cols:1
    });
    $("#about").click(setupLink("about"));
    $("#links").click(setupLink("links"));
    changerUpdated();
});
