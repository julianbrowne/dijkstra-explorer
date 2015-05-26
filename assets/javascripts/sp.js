
var sp = { 

    graph: null,
    svg: null,
    data: {},

    setGraph: function(id) { 
        if(typeof(d3)==="undefined") throw("** d3 library not found");
        this.graph = d3.select(id);
        this.svg = this.graph.append("svg:svg")
            .attr("id", "svg")
            .attr("class", "graph")
            .attr("width", 800)
            .attr("height", 800)
            .on("contextmenu", function() { d3.event.preventDefault(); })
            .on("dblclick", this.addNode);
    },

    findRoute: function() { 
        var nodes = output.getSelectedSourceAndTarget();
        var results = sp.dijkstra(nodes.source, nodes.target);
        this.data.state.routeInProgress = (results.success) ? true : false;
        output.displayResults(results, this.data.distances);
    },

    initData: function(nodeData, pathData) { 
        this.data.nodes = nodeData;
        this.data.paths = pathData;
        this.data.distances = [];
        this.data.state = {};
        this.data.state.selectedNode = null;
        this.data.state.fromNode = null;
        this.data.state.toNode = null;
        this.data.state.routeInProgress = false;
        this.calculateDistances(true);
        nodeData.forEach(function(node) { output.addNodeToSelect(node.name); });
    },

    calculateDistances: function(reinitialise) { 
        if(reinitialise) {
            this.data.distances = [];
            for(var i=0; i<this.data.nodes.length; i++) { 
                this.data.distances[i] = [];
                for(var j=0; j<this.data.nodes.length;j++)
                    this.data.distances[i][j] = 'x';
            }
        };
        for(var i=0; i<this.data.paths.length; i++) { 
            var sourceNodeId = parseInt(this.data.paths[i].from);
            var targetNodeId = parseInt(this.data.paths[i].to);
            var sourceNode = this.data.nodes[sourceNodeId];
            var targetNode = this.data.nodes[targetNodeId];
            /** pythagoras **/
            var xDistance = Math.abs(sourceNode.x - targetNode.x);
            var yDistance = Math.abs(sourceNode.y - targetNode.y);
            var distance = parseInt(Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2)));
            this.data.distances[sourceNodeId][targetNodeId] = distance;
            this.data.distances[targetNodeId][sourceNodeId] = distance;
        };
    },

    clearGraph: function() { 
        this.initData([], []);
        output.cleanUI();
        sp.redrawGraph();
        output.updateStats(this.data.nodes, this.data.paths);
        output.log("cleared graph");
    },

    addNode: function() { 
        if (d3.event.defaultPrevented) return;
        var position = d3.mouse(this);
        var nodeName = sp.data.nodes.length;
        output.log("Adding node " + nodeName);
        sp.data.nodes.push({ 
            name: nodeName,
            x: parseInt(position[0]), 
            y: parseInt(position[1])
        });
        sp.redrawNodes();
        output.addNodeToSelect(nodeName);
        output.updateStats(sp.data.nodes, sp.data.paths);
    },

    init: function() { 
        this.initData([], []);
        output.buttons();       // initialise all button clicks etc
        output.events();        // initialise DOM event handlers
        output.updateStats(this.data.nodes, this.data.paths);
    },

    dragManager: d3.behavior.drag().on('drag', function(d, i) { 
        var node = d3.select(this);
        var position = d3.mouse(document.getElementById('svg'));
        var nodeDatum = { 
            name: d.name, 
            x: parseInt(position[0]), 
            y: parseInt(position[1])
        };
        output.log("node "+i+" at ["+parseInt(position[0])+","+parseInt(position[1])+"]");
        sp.data.nodes[i] = nodeDatum;
        sp.calculateDistances(false);
        sp.redrawGraph();
        if(sp.data.state.routeInProgress) sp.findRoute();
    }),

    redrawNodes: function () { 
        $("g.nodes").remove();
        var elements = sp.svg.selectAll("g.nodes")
            .data(sp.data.nodes, function(d,i) { return d.name; });
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
                .style("cursor", "pointer")
                .on('click', function(d,i) { 
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                })
                .on('dblclick', function(d,i) { 
                    d3.event.stopPropagation();
                    console.log("dblclick");
                })
                .on('contextmenu', function(d,i) { sp.startEndPath(i); })
                .call(sp.dragManager)
            .append("svg:title")
                .text(function(d,i) { return JSON.stringify(d); });
        nodesEnter
            .append("text")
                .attr("nodeLabelId", function(d,i) {return i;})
                .attr("dx", "-5")
                .attr("dy", "5")
                .attr("class", "label")
                .on('contextmenu', function(d,i) { sp.startEndPath(i); })
                .call(sp.dragManager)
                .text(function(d,i){ return d.name });
        elements.exit().remove();
    },

    redrawLines: function () { 
        $("g.line").remove();
        var elements = sp.svg
            .selectAll("g.line")
            .data(sp.data.paths, function(d){ return d.id });
        var newElements = elements.enter();
        var group = newElements
            .append("g")
                .attr("class", "line");
        var line = group.append("line")
            .attr("class", function(d) { return "from"+sp.data.nodes[d.from].name+"to"+sp.data.nodes[d.to].name })
            .attr("x1", function(d) { return sp.data.nodes[d.from].x; })
            .attr("y1", function(d) { return sp.data.nodes[d.from].y; })
            .attr("x2", function(d) { return sp.data.nodes[d.to].x;   })
            .attr("y2", function(d) { return sp.data.nodes[d.to].y;   });
        var text = group.append("text")
            .attr("x", function(d) { return parseInt( (sp.data.nodes[d.from].x+sp.data.nodes[d.to].x)/2 ) + 5; })
            .attr("y", function(d) { return parseInt( (sp.data.nodes[d.from].y+sp.data.nodes[d.to].y)/2 ) - 5; })
            .attr("class", "line-label");
        elements.selectAll("text")
            .text(function(d) { return sp.data.distances[d.from][d.to]; });
        elements.exit().remove();
    },

    startEndPath: function (index) { 
        d3.event.stopPropagation();
        d3.event.preventDefault();
        if(sp.data.state.fromNode===null) { 
            output.log("setting start node "+index+" in join");
            sp.data.state.fromNode = index;
        }
        else { 
            if(sp.data.state.fromNode===index) { 
                output.log("ignoring end node "+index+" as same as start node");
                return;
            }
            output.log("setting join from "+sp.data.state.fromNode+" to "+index);
            sp.data.state.toNode = index;
            var pathDatum = { 
                id: sp.data.paths.length,
                from: sp.data.state.fromNode, 
                to: index
            };
            sp.data.paths.push(pathDatum);
            sp.calculateDistances(true);
            sp.redrawGraph();
            output.updateStats(sp.data.nodes, sp.data.paths);
            if(sp.data.state.routeInProgress) sp.findRoute();
            sp.data.state.fromNode = null;
            sp.data.state.toNode = null;
        }
    },

    redrawGraph: function() {
        sp.redrawLines();
        sp.redrawNodes();
    },

    dijkstra: function (start, end) { 

        var nodeCount = sp.data.distances.length,
            infinity = 99999, // larger than largest distance in distances array
            shortestPath = new Array(nodeCount),
            nodeChecked = new Array(nodeCount),
            pred = new Array(nodeCount);

        for (var i=0; i<nodeCount; i++) { 
            shortestPath[i] = infinity;
            pred[i] = null;
            nodeChecked[i] = false;
        }

        shortestPath[start] = 0;

        for (var i=0; i<nodeCount; i++) { 
            var minDist = infinity;
            var closestNode = null;
            for (var j=0; j<nodeCount; j++) { 
                if (!nodeChecked[j]) { 
                    if (shortestPath[j] <= minDist) { 
                        minDist = shortestPath[j];
                        closestNode = j;
                    }
                }
            }

            nodeChecked[closestNode] = true;

            for (var k=0; k<nodeCount; k++) { 
                if (!nodeChecked[k]) {
                    var nextDistance = distanceBetween(closestNode, k, sp.data.distances);
                    if ((parseInt(shortestPath[closestNode]) + parseInt(nextDistance)) < parseInt(shortestPath[k])) {
                        var soFar = parseInt(shortestPath[closestNode]);
                        var extra = parseInt(nextDistance);
                        shortestPath[k] = soFar + extra;
                        pred[k] = closestNode;
                    }
                }
            };

        };

        if (shortestPath[end] < infinity) { 
            var newPath = [];
            var nodes = [];
            var step = { target: parseInt(end) };
            var v = parseInt(end);
            while (v>=0) { 
                v = pred[v];
                if (v!==null && v>=0) { 
                    step.source = v;
                    newPath.unshift(step);
                    nodes.unshift(step.target);
                    step = { target: v };
                }
            }
            nodes.unshift(step.target);
            var totalDistance = shortestPath[end];
            return { mesg: 'OK', success: true, path: newPath, nodes: nodes, source: start, target: end, distance: totalDistance };
        }
        else { 
            return { mesg: 'No path found', success: false, source: start, target: end, distance: 0 };
        }

        function distanceBetween(fromNode, toNode, distances) { 
            var dist = distances[fromNode][toNode];
            if (dist === 'x') dist = infinity;
            return dist;
        }
    }

};
