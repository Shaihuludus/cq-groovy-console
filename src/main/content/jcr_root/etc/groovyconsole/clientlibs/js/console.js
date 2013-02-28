$(function() {
    window.editor = ace.edit('editor');

    var GroovyMode = ace.require('ace/mode/groovy').Mode;

    editor.getSession().setMode(new GroovyMode());
    editor.renderer.setShowPrintMargin(false);

    initializeThemeMenu();
    initializeButtons();
    initializeDragAndDrop();
});

function initializeThemeMenu() {
    var theme = $.cookie('theme');

    if (theme == null) {
        theme = 'ace/theme/solarized_dark';
    }

    editor.setTheme(theme);

    var selectedElement = $.grep($('#dropdown-themes li'), function(element) {
        return $(element).find('a').data('target') == theme;
    });

    if (selectedElement.length) {
        $(selectedElement).addClass('active');
    }

    $('#dropdown-themes li').click(function() {
        var theme = $(this).find('a').data('target');

        editor.setTheme(theme);

        $('#dropdown-themes li').removeClass('active');

        $(this).addClass('active');

        $.cookie('theme', theme, { expires: 365 });
    });
}

function initializeButtons() {
    $('#new-script').click(function() {
        if ($(this).hasClass('disabled')) {
            return;
        }

        resetConsole();

        editor.getSession().setValue('');
    });

    $('#open-script').click(function() {
        if ($(this).hasClass('disabled')) {
            return;
        }

        resetConsole();
        disableToolbar();
        showOpenDialog();
    });

    $('#save-script').click(function() {
        if ($(this).hasClass('disabled')) {
            return;
        }

        resetConsole();

        var script = editor.getSession().getValue();

        if (script.length) {
            disableToolbar();
            showSaveDialog();
        } else {
            showError('Script is empty.');
        }
    });

    $('#run-script').click(function(event) {
        if ($('#run-script').hasClass('disabled')) {
            return;
        }

        resetConsole();

        var script = editor.getSession().getValue();

        if (script.length) {
            editor.setReadOnly(true);

            disableToolbar();

            $('#run-script-text').text('Running...');

            $.post('/etc/groovyconsole/jcr:content.html', {
                script: script
            }).done(function(data) {
                var result = data.executionResult;
                var output = data.outputText;
                var stacktrace = data.stacktraceText;
                var runtime = data.runningTime;

                if (stacktrace && stacktrace.length) {
                    $('#stacktrace').text(stacktrace).fadeIn('fast');
                } else {
                    if (runtime && runtime.length) {
                        $('#running-time pre').text(runtime);
                        $('#running-time').fadeIn('fast');
                    }

                    if (result && result.length) {
                        $('#result pre').text(result);
                        $('#result').fadeIn('fast');
                    }

                    if (output && output.length) {
                        $('#output pre').text(output);
                        $('#output').fadeIn('fast');
                    }
                }
            }).fail(function() {
                showError('Script execution failed.  Check error.log file.');
            }).always(function() {
                editor.setReadOnly(false);

                enableToolbar();

                $('#run-script-text').text('Run Script');
            });
        } else {
            showError('Script is empty.');
        }
    });
}

function initializeDragAndDrop() {
    $('#editor').on({
        'dragover' : handleDragOver,
        'dragleave': handleDragLeave,
        'drop'     : handleFileSelect
    });

    // Disable drag/drop outside of editor
    $(document).on({
        dragenter: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var dt = e.originalEvent.dataTransfer;
            dt.effectAllowed = dt.dropEffect = 'none';
        },
        dragover: function(e) {
            e.stopPropagation();
            e.preventDefault();
            var dt = e.originalEvent.dataTransfer;
            dt.effectAllowed = dt.dropEffect = 'none';
        }
    });
}

function disableToolbar() {
    $('.btn-toolbar .btn').addClass('disabled');
    $('#loader').fadeIn('fast');
}

function enableToolbar() {
    $('#loader').fadeOut('fast');
    $('.btn-toolbar .btn').removeClass('disabled');
}

function showOpenDialog() {
    var dialog = CQ.WCM.getDialog('/apps/groovyconsole/components/console/opendialog');

    dialog.show();
}

function showSaveDialog() {
    var dialog = CQ.WCM.getDialog('/apps/groovyconsole/components/console/savedialog');

    dialog.show();
}

function loadScript(scriptPath) {
    $.get('/crx/server/crx.default/jcr%3aroot' + scriptPath + '/jcr%3Acontent/jcr:data').done(function(script) {
        showSuccess('Script loaded successfully.');

        editor.getSession().setValue(script);
    }).fail(function() {
        showError('Load failed, check error.log file.');
    }).always(function() {
        enableToolbar();
    });
}

function saveScript(fileName) {
    $.post('/bin/groovyconsole/save', {
        fileName: fileName,
        scriptContent: editor.getSession().getValue()
    }).done(function() {
        showSuccess('Script saved successfully.');
    }).fail(function() {
        showError('Save failed, check error.log file.');
    }).always(function() {
        enableToolbar();
    });
}

function refreshOpenDialog(dialog) {
    var tp, root;

    if (dialog.loadedFlag == null) {
        dialog.loadedFlag = true;
    } else {
        tp = dialog.treePanel;
        root = tp.getRootNode();

        tp.getLoader().load(root);
        root.expand();
    }
}

function showSuccess(message) {
    $('#message-success .message').text(message);
    $('#message-success').fadeIn('fast');
}

function showError(message) {
    $('#message-error .message').text(message);
    $('#message-error').fadeIn('fast');
}

function resetConsole() {
    // clear messages
    $('#message-success .message').text('');
    $('#message-success').fadeOut('fast');
    $('#message-error .message').text('');
    $('#message-error').fadeOut('fast');

    // clear results
    $('#stacktrace').text('').fadeOut('fast');
    $('#result').fadeOut('fast');
    $('#result pre').text('');
    $('#output').fadeOut('fast');
    $('#output pre').text('');
    $('#running-time').fadeOut('fast');
    $('#running-time pre').text('');
}

function handleFileSelect(jqEvent) {
    var evt = jqEvent.originalEvent;

    var files = evt.dataTransfer.files; // FileList object.

    if (files.length !== 1) {
        return;
    }

    var f = files[0];
    var textMimeRE = new RegExp(/text\//);
    if (!(f.type === "" || textMimeRE.test(f.type))) {
        return;
    }
    evt.stopPropagation();
    evt.preventDefault();

//    f.name
//    f.type || 'n/a'
//    f.size, ' bytes, last modified: ',
//    f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',


    var reader = new FileReader();

    reader.onload = function(progressEvt) {
        editor.getSession().setValue(progressEvt.target.result);
    };

    reader.readAsText(f);
    cleanUpDropDecoration(jqEvent.delegateTarget);
}

function handleDragOver(jqEvent) {
    var evt = jqEvent.originalEvent;

    var items = evt.dataTransfer.items;

    if (items.length !== 1) {
        return;
    }

    var item = items[0];
    if (!(item.type === "" && item.kind === "file")) {
        return;
    }
    evt.stopPropagation();
    evt.preventDefault();

    evt.dataTransfer.dropEffect = 'copy';

    $(jqEvent.delegateTarget).css({
        'outline'      : 'none',
        'box-shadow'   : '0 0 10px 5px #9ecaed'
    });
}

function handleDragLeave(jqEvent) {
    cleanUpDropDecoration(jqEvent.delegateTarget);
}

function cleanUpDropDecoration(domNode) {
    $(domNode).css({
        'box-shadow'   : 'none'
    });
}
