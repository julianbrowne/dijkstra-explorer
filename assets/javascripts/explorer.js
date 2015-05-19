
var graph, svg;

var data = { 
    nodes: [], 
    paths: [], 
    distances: [],
    state: { 
        selectedNode: null,
        fromNode: null,
        toNode: null
    }
};

$(function() { 

    graph = d3.select('#graph');

    svg = graph.append("svg:svg")
        .attr("id", "svg")
        .attr("class", "graph")
        .attr("width", 1000)
        .attr("height", 800)
        .on("click", nullEventHandler("svg:click"))
        .on("contextmenu", function() { d3.event.preventDefault(); })
        .on("dblclick", addNode);

});

function nullEventHandler(name) { 
    return function() { 
        //console.log(name);
    };
};

function findRoute() { 
    d3.selectAll("line").classed({"shortest": false});
    calculateDistances();
    var fromInput = document.getElementById("from");
    var toInput = document.getElementById("to");
    if(fromInput.options[fromInput.selectedIndex]===undefined||toInput.options[toInput.selectedIndex]===undefined) return;
    var fromNode = fromInput.options[fromInput.selectedIndex].value;
    var toNode = toInput.options[toInput.selectedIndex].value;
    var results = dijkstra(fromNode, toNode);
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
            console.log(stepLine);
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
    info("Adding node "+data.nodes.length);
    data.nodes.push({ 
        name: data.nodes.length,
        x: parseInt(position[0]), 
        y: parseInt(position[1])
    });
    redrawNodes();
    addNodesToOption();
    updateStats('node-count', data.nodes.length);
};

function updateStats(id, value) { 
    $("#"+id).html(value);
};

function info(text) {
    $("#info").html(text);
};

function addNodesToOption() { 
    var fromInput = document.getElementById("from");
    var toInput = document.getElementById("to");
    empty(fromInput);
    empty(toInput);
    data.nodes.forEach(function(node) { 
        var fromOption = document.createElement("option");
        fromOption.text = node.name;
        fromInput.add(fromOption);
        var toOption = document.createElement("option");
        toOption.text = node.name;
        toInput.add(toOption);
    });
};

function empty(element) { 
    while (element.hasChildNodes()) element.removeChild(element.lastChild);
};

function clearGraph() { 
    console.log("clearing graph");
    data.nodes = [];
    data.paths = [];
    redrawNodes();
    redrawLines();
};

function redrawNodes() { 

    svg.selectAll("g").data([]).exit().remove();

    var elements = svg.selectAll("g")
        .data(data.nodes, function(d,i) { return d.name; });

    var nodesEnter = elements.enter().append("g");

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

};

function redrawLines() { 

    svg.selectAll("line").data([]).exit().remove();

    var lines = svg.selectAll("line")
        .data(data.paths);

    lines.enter()
        .append("line")
            .attr("class", function(d) { return "from"+data.nodes[d.from].name+"to"+data.nodes[d.to].name })
            .attr("x1", function(d) { return data.nodes[d.from].x; })
            .attr("y1", function(d) { return data.nodes[d.from].y; })
            .attr("x2", function(d) { return data.nodes[d.to].x;   })
            .attr("y2", function(d) { return data.nodes[d.to].y;   });

    lines.exit().remove();

    updateStats('path-count', data.paths.length);


/**
var elements = svg.selectAll("g");

var elementsPathData = elements.data(paths);

var pathsEnter = elementsPathData
    .enter()
        .append("g");

pathsEnter
    .append("line")
        .attr("x1", function(d) { return nodes[d.from].x; })
        .attr("y1", function(d) { return nodes[d.from].y; })
        .attr("x2", function(d) { return nodes[d.to].x; })
        .attr("y2", function(d) { return nodes[d.to].y; })

pathsEnter
    .append("text")
        .attr("x", function(d) { return parseInt( (nodes[d.from].x+nodes[d.to].x)/2 ) + 5; })
        .attr("y", function(d) { return parseInt( (nodes[d.from].y+nodes[d.to].y)/2 ) - 5; })
        .attr("class", "line-label")
        .text(function(d,i) { return distances[d.from][d.to]; });
**/


};

function nodeClick(d,i) { 
    console.log("node:click %s", i);
    console.log(d);
    d3.event.preventDefault();
    d3.event.stopPropagation();
};

var dragManager = d3.behavior.drag()
    .on('dragstart', dragNodeStart())
    .on('drag', dragNode())
    .on('dragend', dragNodeEnd());

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
            from: data.state.fromNode, 
            to: index
        };
        data.paths.push(pathDatum);
        redrawLines();
        redrawNodes();
        data.state.fromNode = null;
        data.state.toNode = null;
    }
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

    for (var i=0; i<data.paths.length; i++) { 

        var sourceNodeId = parseInt(data.paths[i].from);
        var targetNodeId = parseInt(data.paths[i].to);
        var sourceNode = data.nodes[sourceNodeId];
        var targetNode = data.nodes[targetNodeId];

        /** pythagoras **/

        xDistance = Math.abs(sourceNode.x - targetNode.x);
        yDistance = Math.abs(sourceNode.y - targetNode.y);
        distance = parseInt(Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2)));

        data.distances[sourceNodeId][targetNodeId] = distance;
        data.distances[targetNodeId][sourceNodeId] = distance;
    };
    console.log(data.distances);
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