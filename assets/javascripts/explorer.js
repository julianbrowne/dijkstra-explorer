
var graph, svg;

var data = { 
    nodes: [], 
    paths: [], 
    distances: [],
    state: { 
        selectedNode: null,
        fromNode: null,
        toNode: null
    },
    ui: { 
        inputSelectSourceNode: "#from",
        inputSelectTargetNode: "#to"
    }
};

var dragManager = d3.behavior.drag()
    .on('dragstart', dragNodeStart())
    .on('drag', dragNode())
    .on('dragend', dragNodeEnd());

$(function() { 

    graph = d3.select('#graph');

    svg = graph.append("svg:svg")
        .attr("id", "svg")
        .attr("class", "graph")
        .attr("width", 800)
        .attr("height", 800)
        .on("click", nullEventHandler("svg:click"))
        .on("contextmenu", function() { d3.event.preventDefault(); })
        .on("dblclick", addNode);

    initUI();

});

function initUI() { 

    updateStats();

    var popovers = ".datamgr.import";

    $(popovers).popover({ 
        delay: { show: 400, hide: 300 },
        trigger: "hover"
    });

    $(".datamgr.export").click(function(e) { 

        e.stopPropagation()

        var exportData = JSON.stringify({ 
            nodes: data.nodes,
            paths: data.paths
        });

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

    $("#data-import").change(function(e) { 
        e.stopPropagation();
        var files = e.target.files;
        var file = files[0];
        if(file===undefined) return;
        var reader = new FileReader();
        reader.onload = function() { 
            try { 
                var importedData = JSON.parse(this.result);
            }
            catch (exception) { 
                console.log("** Error importing JSON: %s", exception);
                return;
            }
            if(    importedData.nodes === undefined
                || importedData.paths === undefined
                || Object.keys(importedData).length !== 2) { 
                console.log("** JSON format error:");
                console.log(importedData);
                return;
            }

            //todo: refactor into initData(nodes,paths) and use for start-up too

            data.nodes = importedData.nodes;
            data.paths = importedData.paths;
            data.distances = [];
            data.state.selectedNode = null;
            data.state.fromNode = null;
            data.state.toNode = null;

            data.nodes.forEach(function(node) { 
                addNodeToSelect(node.name);
            });

            calculateDistances();
            redrawLines();
            redrawNodes();
        }
        reader.readAsText(file);
    });

};

function nullEventHandler(name) { 
    return function() { 
        //console.log(name);
    };
};

function findRoute() { 
    d3.selectAll("line").classed({"shortest": false});
    calculateDistances();
    if(!$(data.ui.inputSelectSourceNode).val()||!$(data.ui.inputSelectTargetNode).val()) return;
    var sourceNode = $(data.ui.inputSelectSourceNode).val();
    var targetNode = $(data.ui.inputSelectTargetNode).val();
    var results  = dijkstra(sourceNode, targetNode);
    printResults(results);
};

function printResults(results) { 
    var target = document.getElementById("results");
    while (target.hasChildNodes()) target.removeChild(target.lastChild);
    var title = document.createElement("h4");
    title.innerHTML = "Route from " + results.source + " to " + results.target;
    var summary = document.createElement("p");
    summary.innerHTML = "Found route: " + results.mesg;
    var pathList = document.createElement("ul");
    if(results.path) {
        results.path.forEach(function(step) { 
            var stepItem = document.createElement("li");
            var dist = data.distances[step.source][step.target]
            stepItem.innerHTML = "from " + step.source + " to " + step.target + " (" + dist + " units)";
            stepLine = d3.select(
                "line.from" + step.source + "to" + step.target + ","
              + "line.from" + step.target + "to" + step.source
            );
            stepLine.classed({"shortest": true});
            pathList.appendChild(stepItem);
        });
    }
    var distance = document.createElement("p");
    distance.innerHTML = "Total distance: " + results.distance + " units";
    target.appendChild(title);
    target.appendChild(summary);
    target.appendChild(pathList);
    target.appendChild(distance);
};

function addNode() { 
    if (d3.event.defaultPrevented) return;
    var position = d3.mouse(this);
    var nodeName = data.nodes.length;
    info("Adding node " + nodeName);
    data.nodes.push({ 
        name: nodeName,
        x: parseInt(position[0]), 
        y: parseInt(position[1])
    });
    redrawNodes();
    addNodeToSelect(nodeName);
    updateStats('node-count', data.nodes.length);
};

function info(text) { 
    $("#info").html(text);
};

function addNodeToSelect(nodeName) { 
    $(data.ui.inputSelectSourceNode).append($("<option></option>").attr("value",nodeName).text(nodeName));
    $(data.ui.inputSelectTargetNode).append($("<option></option>").attr("value",nodeName).text(nodeName));
};

function clearGraph() { 
    info("cleared graph");
    data.nodes = [];
    data.paths = [];
    cleanUI();
    redrawNodes();
    redrawLines();
    updateStats();
};

function updateStats() { 
    $("#node-count").html(data.nodes.length);
    $("#path-count").html(data.paths.length);
};

function cleanUI() {
    $(data.ui.inputSelectSourceNode).empty();
    $(data.ui.inputSelectTargetNode).empty();
    $("#results").empty();
    $('#distances-table').empty();
};

function redrawNodes() { 

    svg.selectAll("g.nodes").data([]).exit().remove();

    var elements = svg.selectAll("g.nodes")
        .data(data.nodes, function(d,i) { return d.name; });

    var nodesEnter = elements.enter()
        .append("g")
            .attr("class", "nodes");

    elements.attr("transform", function(d,i) { 
        return "translate("+d.x+","+d.y+")";
    });

    nodesEnter
        .append("circle")
            .attr("nodeId", function(d,i) {return i;})
            .attr("r", '20')
            .attr("class", "node")
            //.style('filter', 'url(#dropshadow)')
            .style("cursor", "pointer")
            .on('click', nodeClick)
            .on('contextmenu', function(d,i) { startEndPath(i); })
            .call(dragManager)
        .append("svg:title")
            .text(function(d,i) { return JSON.stringify(d); });

    nodesEnter
        .append("text")
            .attr("nodeLabelId", function(d,i) {return i;})
            .attr("dx", "-5")
            .attr("dy", "5")
            .attr("class", "label")
            .on('contextmenu', function(d,i) { startEndPath(i); })
            .call(dragManager)
            .text(function(d,i){ return d.name });

    elements.exit().remove();

    $("#nodes-table").html(drawDataTable(data.nodes));

};

function redrawLines() { 

    /** clear away old lines first **/

    svg.selectAll("g.line").data([]).exit().remove();

    var elements = svg
        .selectAll("g.line")
        .data(data.paths, function(d){ return d.id });

    var newElements = elements.enter();

    /** new lines **/

    var group = newElements
        .append("g")
            .attr("class", "line");

    var line = group.append("line")
        .attr("class", function(d) { return "from"+data.nodes[d.from].name+"to"+data.nodes[d.to].name })
        .attr("x1", function(d) { return data.nodes[d.from].x; })
        .attr("y1", function(d) { return data.nodes[d.from].y; })
        .attr("x2", function(d) { return data.nodes[d.to].x;   })
        .attr("y2", function(d) { return data.nodes[d.to].y;   });

    /** new line labels **/

    var text = group.append("text")
        .attr("x", function(d) { return parseInt( (data.nodes[d.from].x+data.nodes[d.to].x)/2 ) + 5; })
        .attr("y", function(d) { return parseInt( (data.nodes[d.from].y+data.nodes[d.to].y)/2 ) - 5; })
        .attr("class", "line-label");

    /** updated line labels **/

    elements.selectAll("text")
        .text(function(d) { return data.distances[d.from][d.to]; });

    /** defunct lines **/

    elements.exit().remove();

    $("#paths-table").html(drawDataTable(data.paths));

    updateStats();
};

function nodeClick(d,i) { 
    console.log("node:click %s", i);
    console.log(d);
    d3.event.preventDefault();
    d3.event.stopPropagation();
};

function dragNodeStart() { 
    return function(d, i) { 
        //info("dragging node "+i);
    }
};

function dragNode() { 
    return function(d, i) { 
        var node = d3.select(this);
        var position = d3.mouse(document.getElementById('svg'));
        var nodeDatum = { 
            name: d.name, 
            x: parseInt(position[0]), 
            y: parseInt(position[1])
        };
        info("node "+i+" at ["+parseInt(position[0])+","+parseInt(position[1])+"]");
        data.nodes[i] = nodeDatum;
        calculateDistances();
        redrawLines();
        redrawNodes();
    }
};

function dragNodeEnd() { 
    return function(d, i) { 
        //info("node "+i+" repositioned");
    }
};

function killEvent() { 
    if(d3.event.preventDefault) { 
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
};

function startEndPath(index) { 
    d3.event.stopPropagation();
    d3.event.preventDefault();
    if(data.state.fromNode===null) { 
        info("setting start node "+index+" in join");
        data.state.fromNode = index;
    }
    else { 
        if(data.state.fromNode===index) { 
            info("ignoring end node "+index+" as same as start node");
            return;
        }
        info("setting join from "+data.state.fromNode+" to "+index);
        data.state.toNode = index;
        var pathDatum = { 
            id: data.paths.length,
            from: data.state.fromNode, 
            to: index
        };
        data.paths.push(pathDatum);
        calculateDistances();
        redrawLines();
        redrawNodes();
        data.state.fromNode = null;
        data.state.toNode = null;
    }
};

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
};

function calculateDistances() { 

    /** initialise distances **/

    data.distances = [];
    for(var i=0; i<data.nodes.length; i++) { 
        data.distances[i] = [];
        for(var j=0; j<data.nodes.length;j++)
            data.distances[i][j] = 'x';
    }

    /** calculate distances **/

    for(var i=0; i<data.paths.length; i++) { 

        var sourceNodeId = parseInt(data.paths[i].from);
        var targetNodeId = parseInt(data.paths[i].to);
        var sourceNode = data.nodes[sourceNodeId];
        var targetNode = data.nodes[targetNodeId];

        /** pythagoras **/

        var xDistance = Math.abs(sourceNode.x - targetNode.x);
        var yDistance = Math.abs(sourceNode.y - targetNode.y);
        var distance = parseInt(Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2)));

        data.distances[sourceNodeId][targetNodeId] = distance;
        data.distances[targetNodeId][sourceNodeId] = distance;
    };

    $('#distances-table').empty();

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
    for(var th=0; th<data.nodes.length; th++) { 
        var cell = $("<th></th>");
        cell.addClass("text-center")
        cell.addClass("bg-muted");
        cell.addClass("col-md-1");
        cell.html(th);
        cell.appendTo(headerRow);
    };
    headerRow.appendTo(table);

    for(var source=0; source<data.distances.length; source++) { 
        var normalRow = $("<tr></tr>");
        for(var target=0; target<data.nodes.length;target++) { 
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
            cell.html(data.distances[source][target]);
            cell.appendTo(normalRow);
        };
        normalRow.appendTo(table);
    };
    table.appendTo('#distances-table');
    
};

function dijkstra(start, end) { 

    var nodeCount = data.distances.length,
        infinity = 99999, // larger than largest distance in distances array
        shortestPath = new Array(nodeCount),
        nodeChecked = new Array(nodeCount),
        pred = new Array(nodeCount);

    // initialise data placeholders

    for (var i = 0; i < nodeCount; i++) {
        shortestPath[i] = infinity;
        pred[i] = null;
        nodeChecked[i] = false;
    }

    shortestPath[start] = 0;

    for (var i = 0; i < nodeCount; i++) {

        var minDist = infinity;
        var closestNode = null;

        for (var j = 0; j < nodeCount; j++) {

            if (!nodeChecked[j]) {
                if (shortestPath[j] <= minDist) {
                    minDist = shortestPath[j];
                    closestNode = j;
                }
            }
        }

        nodeChecked[closestNode] = true;

        for (var k = 0; k < nodeCount; k++) {
            if (!nodeChecked[k]) {
                var nextDistance = distanceBetween(closestNode, k, data.distances);
                if ((parseInt(shortestPath[closestNode]) + parseInt(nextDistance)) < parseInt(shortestPath[k])) {
                    soFar = parseInt(shortestPath[closestNode]);
                    extra = parseInt(nextDistance);
                    shortestPath[k] = soFar + extra;
                    pred[k] = closestNode;
                }
            }
        }

    }

    if (shortestPath[end] < infinity) {

        var newPath = [];
        var step = {
            target: parseInt(end)
        };

        var v = parseInt(end);

        while (v >= 0) {
            v = pred[v];
            if (v !== null && v >= 0) {
                step.source = v;
                newPath.unshift(step);
                step = {
                    target: v
                };
            }
        }

        totalDistance = shortestPath[end];

        return {
            mesg: 'OK',
            path: newPath,
            source: start,
            target: end,
            distance: totalDistance
        };
    } else {
        return {
            mesg: 'No path found',
            path: null,
            source: start,
            target: end,
            distance: 0
        };
    }

    function distanceBetween(fromNode, toNode, distances) { 
        dist = distances[fromNode][toNode];
        if (dist === 'x') dist = infinity;
        return dist;
    }

};