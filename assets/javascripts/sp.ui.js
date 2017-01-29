
var UI = (function() { 

    var selectors = { 
        inputSelectSourceNode: "#from",
        inputSelectTargetNode: "#to",
        statsNodeCount: "#node-count",
        statsPathCount: "#path-count",
        statsSVGWidth: "#svg-width",
        statsSVGHeight: "#svg-height",
        inputNodeRadius: "#node-radius",
        buttonSetNodeRadius: "#set-node-radius",

        graphBackgroundUrlForm: "#graph-bg-url-form",
        graphBackgroundUrlChooserInput: "#graph-bg-url-chooser",

        graphBackgroundFileSelectButton: "#graph-bg-file-button",
        graphBackgroundFileChooserInput: "#graph-bg-file-chooser",
        graphBackgroundFileNameChosen: "#graph-bg-filename"

    };

    function bindActionToElementEvent(selector, event, action) { 
        $(selector).on(event, function(e) { 
            e.stopPropagation();
            e.preventDefault();
            action.call(this, e);
        });
    };

    function initButtons() { 

        bindActionToElementEvent("button.route", "click", function(e) { 
            sp.calculateDistances(false);
            sp.findRoute();
        });

        bindActionToElementEvent("button.clear-graph", "click", function(e) { 
            sp.clearGraph();
        });

        bindActionToElementEvent(selectors.inputNodeRadius, "change", function(e) { 
            var newRadius = $(selectors.inputNodeRadius).val();
            sp.setNodeRadius(newRadius);
            sp.defaults.nodeRadius = newRadius;
            updateSVGStats();
        });

        bindActionToElementEvent(selectors.graphBackgroundUrlForm, "submit", function(e) { 
            setGraphBGToURL($(selectors.graphBackgroundUrlChooserInput).val());
        });

        bindActionToElementEvent(".datamgr .export", "click", function(e) { 
            var exportData = JSON.stringify({ nodes: sp.data.nodes, paths: sp.data.paths });
            var target = $(this);
            var link = $("<a></a>")
                .addClass("exportLink")
                .click(function(e) { e.stopPropagation(); })
                .attr('target', '_self')
                .attr("download", "dijkstra-explorer-data.json")
                .attr("href", "data:application/json," + exportData)
            link.appendTo(target).get(0).click();
            $(".exportLink").remove();
        });

        bindActionToElementEvent(selectors.graphBackgroundFileSelectButton, "click", function(e) { 
            $(selectors.graphBackgroundFileChooserInput).val("");
            $(selectors.graphBackgroundFileChooserInput).click();
        });

        bindActionToElementEvent(selectors.graphBackgroundFileChooserInput, "change", function(e) { 

            var files = e.target.files;
            var file = files[0];
            var imageType = /image.*/;

            if(file===undefined || !file.type.match(imageType)) { 
                log("** No valid image selected");
                return;
            };

            log("loading file " + file.name + ": " + file.size + " bytes");
            $(selectors.graphBackgroundFileNameChosen).val(file.name);

            var reader = new FileReader();

            reader.onload = function() { 
                setGraphBackgroundImage(reader.result);
            };

            reader.onprogress = function(e) { 
                var pc = Math.round((e.loaded / e.total) * 100);
                log("loading file "+file.name+": "+pc+" %");
            };

            reader.readAsDataURL(file);
        });

        bindActionToElementEvent(".datamgr .import", "change", function(e) { 

            var files = e.target.files;
            var file = files[0];

            if(file===undefined) return;

            var reader = new FileReader();

            reader.onload = function() { 

                try { 
                    var importedData = JSON.parse(reader.result);
                }
                catch (exception) { 
                    log("** Error importing JSON: " + exception);
                    return;
                }

                if(importedData.nodes === undefined||importedData.paths === undefined||Object.keys(importedData).length !== 2) { 
                    log("** JSON format error");
                    return;
                }

                sp.initData(importedData.nodes, importedData.paths);
                log("Imported " + sp.data.nodes.length + " nodes and " + sp.data.paths.length + " paths");
                sp.redrawLines();
                sp.redrawNodes();
            }
            reader.readAsText(file);
        });

    }

    function setScrollOnBackground() { 

        getBackgroundImageDimensions(function(width, height) { 
            $('#graph').width(width);
            $('#graph').height(height);
            $('#graph-container').css("overflow", "auto");
        });
    }

    function getBackgroundImageDimensions(callback) { 

        var image_url = $('#graph').css('background-image').match(/^url\("?(.+?)"?\)$/);

        if (image_url[1]) { 
            image_url = image_url[1];
            var image = new Image();
            $(image).load(function () { 
                callback(image.width, image.height);
            });
            image.src = image_url;
        }

    }

    function initEvents() { 

        $("#data-tab-trigger").on('shown.bs.tab', function (e) { 
            // e.target        // newly activated tab
            // e.relatedTarget // previous active tab
            displayPaths(sp.data.paths);
            displayNodes(sp.data.nodes);
            displayDistances(sp.data.distances);
        });

    }

    function addNodeToSelect(nodeIndex) { 
        $(selectors.inputSelectSourceNode).append($("<option></option>").attr("value",nodeIndex).text(nodeIndex));
        $(selectors.inputSelectTargetNode).append($("<option></option>").attr("value",nodeIndex).text(nodeIndex));
    }

    function clear() { 
        $(selectors.inputSelectSourceNode).empty();
        $(selectors.inputSelectTargetNode).empty();
        $("#results").empty();
        $('#distances-table').empty();
    }

    function getSelectedSourceAndTarget() { 
        if(!$(selectors.inputSelectSourceNode).val()||!$(selectors.inputSelectTargetNode).val())
            return false;
        var sourceNode = $(selectors.inputSelectSourceNode).val();
        var targetNode = $(selectors.inputSelectTargetNode).val();
        return { source: sourceNode, target: targetNode};
    }

    function setGraphBGToURL(url) { 

        if(url===undefined||url===null||!(/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url))) { 
            console.log("invalid url");
            return false;
        }

        setGraphBackgroundImage(url);

    }

    function setGraphBackgroundImage(url) { 
        $("#graph").css({ "background-image": "url(" + url + ")" });
        setScrollOnBackground();
        resizeSVG();
    }

    function resizeSVG() { 
        getBackgroundImageDimensions(function(width, height) { 
            log("setting graph dimensions to " + width + "px x " + height + "px");
            sp.svg.attr("width", width).attr("height", height);
            updateSVGStats();
        });
    }

    function displayPaths(pathData) { 
        if(pathData.length===0) { 
            $("#paths-table").html("<p>no paths</p>");
            return;
        }
        $("#paths-table").html(drawDataTable(pathData));
    }

    function displayNodes(nodeData) { 
        if(nodeData.length===0) { 
            $("#nodes-table").html("<p>no nodes</p>");
            return;
        }
        $("#nodes-table").html(drawDataTable(nodeData));
    }

    function drawDataTable(dataArray) { 

        var table = $("<table></table>")
            .addClass("table")
            .addClass("table-bordered")
            .addClass("table-condensed")
            .addClass("auto-width");
        var sample = dataArray[0];
        var headerRow = $("<tr></tr>");
        var columns = [];
        for(var column in sample) { 
            columns.push(column);
            var cell = $("<th></th>");
            cell.addClass("text-center")
            cell.addClass("bg-muted");
            cell.addClass("col-md-1");
            cell.html(column);
            cell.appendTo(headerRow);
        }
        headerRow.appendTo(table);
        dataArray.forEach(function(item) { 
            var normalRow = $("<tr></tr>");
            columns.forEach(function(column) { 
                var cell = $("<td></td>");
                cell.addClass("text-center")
                cell.addClass("col-md-1");
                cell.html(item[column]);
                cell.appendTo(normalRow);
            });
            normalRow.appendTo(table);
        });
        return table;
    }

    function displayDistances(distanceData) { 

        if(distanceData.length===0) { 
            $('#distances-table').html("no distances");
            return;
        }

        var table = $("<table></table>")
            .addClass("table")
            .addClass("table-bordered")
            .addClass("table-condensed")
            .addClass("auto-width");

        var headerRow = $("<tr></tr>");
        var cell = $("<th>node</th>");
        cell.addClass("text-center")
        cell.addClass("bg-muted");
        cell.appendTo(headerRow);

        for(var th=0; th<distanceData.length; th++) { 
            var cell = $("<th></th>");
            cell.addClass("text-center")
            cell.addClass("bg-muted");
            cell.addClass("col-md-1");
            cell.html(th);
            cell.appendTo(headerRow);
        };

        headerRow.appendTo(table);

        for(var source=0; source<distanceData.length; source++) { 
            var normalRow = $("<tr></tr>");
            for(var target=0; target<distanceData.length;target++) { 
                if(target===0) { 
                    var cell = $("<th></th>");
                    cell.addClass("text-center")
                    cell.addClass("bg-muted");
                    cell.addClass("col-md-1");
                    cell.html(source);
                    cell.appendTo(normalRow);
                }
                var cell = $("<td></td>");
                cell.addClass("text-center")
                cell.addClass("col-md-1");
                cell.html(distanceData[source][target]);
                cell.appendTo(normalRow);
            };
            normalRow.appendTo(table);
        };

        $('#distances-table').html(table);

    }

    function displayResults(results, distanceData) { 

        d3.selectAll("line")
            .classed({"shortest": false});
        var target = $("#results");
        target.empty();
        var title = $("<p></p>");
        title.html("Route from " + results.source + " to " + results.target);
        var summary = $("<p></p>");
        summary.html("Found route: " + results.mesg);
        var pathList = $("<ul></ul>");
        if(results.path) {
            results.path.forEach(function(step) { 
                var stepItem = $("<li></li>");
                var dist = distanceData[step.source][step.target]
                stepItem.html("from " + step.source + " to " + step.target + " (" + dist + " units)");
                var stepLine = d3.select(
                    "line.from" + step.source + "to" + step.target + ","
                  + "line.from" + step.target + "to" + step.source
                );
                stepLine.classed({"shortest": true});
                pathList.append(stepItem);
            });
        }
        var distance = $("<p></p>");
        distance.html("Total distance: " + results.distance + " units");
        target.append(title);
        target.append(summary);
        target.append(pathList);
        target.append(distance);
    }

    function updateStats(nodeData, pathData) { 
        $(selectors.statsNodeCount).html(nodeData.length);
        $(selectors.statsPathCount).html(pathData.length);
        updateSVGStats();
    }

    function updateSVGStats() { 
        if(sp.svg) { 
            $(selectors.statsSVGWidth).html(sp.svg.attr("width"));
            $(selectors.statsSVGHeight).html(sp.svg.attr("height"));
            $(selectors.inputNodeRadius).val(sp.getNodeRadius());

        }
    }

    function log(text) { 
        $("#info").html(text);
    }

    return { 
        initButtons: initButtons,
        initEvents: initEvents,
        updateStats: updateStats,
        addNodeToSelect: addNodeToSelect,
        getSelectedSourceAndTarget: getSelectedSourceAndTarget,
        displayResults: displayResults,
        clear: clear,
        log: log
    }

}($));
