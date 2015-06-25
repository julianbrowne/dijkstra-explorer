
var output = { 

    tags: { 
        inputSelectSourceNode: "#from",
        inputSelectTargetNode: "#to"
    },

    buttonAction: function(tag, event, action) { 
        $(tag).on(event, function(e) { 
            e.stopPropagation();
            e.preventDefault();
            action.call(this, e);
        });
    },

    buttons: function() { 

        this.buttonAction("button.route", "click", function(e) { 
            sp.calculateDistances(false);
            sp.findRoute();
        });

        this.buttonAction("button.clear-graph", "click", function(e) { 
            sp.clearGraph();
        });

        this.buttonAction(".graph-bg", "submit", function(e) { 
            output.setGraphBGToURL($("#graph-bg-url").val());
        });

        this.buttonAction(".datamgr .export", "click", function(e) { 
            var exportData = JSON.stringify({ nodes: sp.data.nodes, paths: sp.data.paths });
            var target = $(this);
            var link = $("<a></a>")
                .addClass("exportLink")
                .click(function(e) { e.stopPropagation(); })
                .attr('target', '_self')
                .attr("download", "dijkstra-explorer-data.json")
                .attr("href", "data:application/json,"+exportData)
            link.appendTo(target).get(0).click();
            $(".exportLink").remove();
        });

        this.buttonAction("#graph-bg-file", "change", function(e) { 
            var files = e.target.files;
            var file = files[0];
            var imageType = /image.*/;
            if(file===undefined||!file.type.match(imageType)) { 
                output.log("** No valid image selected");
                return;
            };
            output.log("loading file "+file.name+": "+file.size+" bytes");
            var reader = new FileReader();
            reader.onload = function() { $("#graph").css({ "background-image": "url("+this.result+")" }); };
            reader.onprogress = function(e) { 
                var pc = Math.round((e.loaded / e.total) * 100);
                output.log("loading file "+file.name+": "+pc+" %");
            };
            reader.readAsDataURL(file);
        });

        this.buttonAction(".datamgr .import", "change", function(e) { 
            var files = e.target.files;
            var file = files[0];
            if(file===undefined) return;
            var reader = new FileReader();
            reader.onload = function() { 
                try { 
                    var importedData = JSON.parse(this.result);
                }
                catch (exception) { 
                    output.log("** Error importing JSON: " + exception);
                    return;
                }
                if(importedData.nodes === undefined||importedData.paths === undefined||Object.keys(importedData).length !== 2) { 
                    output.log("** JSON format error");
                    return;
                }
                sp.initData(importedData.nodes, importedData.paths);
                output.log("Imported " + sp.data.nodes.length + " nodes and " + sp.data.paths.length + " paths");
                sp.redrawLines();
                sp.redrawNodes();
            }
            reader.readAsText(file);
        });

    },

    events: function() {
        $("#data-tab-trigger").on('shown.bs.tab', function (e) { 
            // e.target // newly activated tab
            // e.relatedTarget // previous active tab
            output.displayPaths(sp.data.paths);
            output.displayNodes(sp.data.nodes);
            output.displayDistances(sp.data.distances);
        });
    },

    addNodeToSelect: function (nodeIndex) { 
        $(this.tags.inputSelectSourceNode).append($("<option></option>").attr("value",nodeIndex).text(nodeIndex));
        $(this.tags.inputSelectTargetNode).append($("<option></option>").attr("value",nodeIndex).text(nodeIndex));
    },

    cleanUI: function () { 
        $(this.tags.inputSelectSourceNode).empty();
        $(this.tags.inputSelectTargetNode).empty();
        $("#results").empty();
        $('#distances-table').empty();
    },

    getSelectedSourceAndTarget: function() { 
        if(!$(this.tags.inputSelectSourceNode).val()||!$(this.tags.inputSelectTargetNode).val())
            return false;
        var sourceNode = $(this.tags.inputSelectSourceNode).val();
        var targetNode = $(this.tags.inputSelectTargetNode).val();
        return { source: sourceNode, target: targetNode};
    },

    setGraphBGToURL: function (url) { 
        if(url===undefined||url===null||!(/^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url))) { 
            console.log("invalid url");
            return false;
        }
        $("#graph").css("background", "url("+url+")");
    },

    displayPaths: function(pathData) { 
        if(pathData.length===0) { 
            $("#paths-table").html("<p>no paths</p>");
            return;
        }
        $("#paths-table").html(this.drawDataTable(pathData));
    },

    displayNodes: function(nodeData) { 
        if(nodeData.length===0) { 
            $("#nodes-table").html("<p>no nodes</p>");
            return;
        }
        $("#nodes-table").html(this.drawDataTable(nodeData));
    },

    drawDataTable: function(dataArray) { 
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
    },

    displayDistances: function (distanceData) { 
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
    },

    displayResults: function(results, distanceData) { 
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
    },

    updateStats: function(nodeData, pathData) { 
        $("#node-count").html(nodeData.length);
        $("#path-count").html(pathData.length);
    },

    log: function(text) { 
        $("#info").html(text);
    }

};
