var ResourceTopologyGraph = function(dataUrl, graphSelector, refreshInterval) {
    var content_width = $(graphSelector).innerWidth(),
        graph = this,
        w = content_width,
        h = content_width,
        rx = w / 2,
        ry = h / 2,
        m0, rotate = 0,
        pi = Math.PI,
        active_link,
        splines = [],
        color_arc = d3.scale.category20(),
        line_color = function(d){
            if(d.hasOwnProperty("source") && d.hasOwnProperty("target")){
                //TODO: find relation object
                d.source.relations.forEach(function(item){

                });
            }
            return "#C7C7C7";
        },
        cross = function(a, b) {
            return a[0] * b[1] - a[1] * b[0];
        },
        dot = function(a, b) {
            return a[0] * b[0] + a[1] * b[1];
        },
        mouseCoordinates = function(e) {
            return [e.pageX - rx, e.pageY - ry];
        };
    var nodeHelpers = {
      nodeServiceId: function(d){
        if(d && d.host && d.service){
            return "node-" + d.host.replace(/\./g,"_") + "-service-" + d.service.replace(/\./g,"_");
        }else{
            console.log("Cannot generate node-service ID, given node or its host/service is undefined! node: " + nodeHelpers.nodeToString(d));
            return "node-" + (node.host?node.host:"UNDEFINED_HOST") + (node.service?node.service:"UNDEFINED_SERVICE");
        }
      },
      nodeToString: function(n, hideRelations){
           var cleanNode = {};
           $.extend(cleanNode, n);
           delete cleanNode.children;
           delete cleanNode.parent;
           if(hideRelations){
             delete cleanNode.relations;
           }
           return JSON.stringify(cleanNode);
      },
      root: function(classes) {
        var map = {};
        var parentObj = {host:"", children:[]};
        var addedHosts = []

        classes.forEach(function(d) {
          //create hosts array
           if(addedHosts.indexOf(d.host) === -1){
              addedHosts.push(d.host);
              var newHost={host: d.host, service: d.host, parent: parentObj}
              newHost.children = [$.extend({parent:newHost}, d)]
              parentObj.children.push(newHost);
          }else{
              // find host and add children
              parentObj.children.forEach(function(item){
                if(item.host == d.host){
                    item.children.push($.extend({parent:item}, d))
                }
              });
          }
        });

        return parentObj;
      },

      // Return a list of imports for the given array of nodes.
      imports: function(nodes) {
        var map = {},
            imports = [];

        // Compute a map from name to node.
        nodes.forEach(function(d) {
          map[d.host+"_"+d.service] = d;
        });

        // For each import, construct a link from the source to target node.
        nodes.forEach(function(d) {
          if (d.relations) {
            d.relations.forEach(function(i) {
                var line = {source: map[d.host+"_"+d.service], target: map[i.host + "_" + i.service], link_str: 2};
                if(line.source && line.target){
                    imports.push(line);
                }else{
                    console.log("Cannot create relation link, node: " + nodeHelpers.nodeToString(d) + " relation: " + JSON.stringify(i));
                }
            });
          }
        });
        return imports;
      }
    };
    this._data = {},
    this.init = function(reinit) {
        if(!dataUrl || !graphSelector){
            throw new Error("Cannot init ResourceTopology graph, dataUrl or graphSelector not defined");
        }
        graph.cluster = d3.layout.cluster()
            .size([360, ry - 150])
            .sort(function(a, b) {
                return d3.ascending(a.service, b.service);
            });
        graph.bundle = d3.layout.bundle();
        graph.line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(.8)
            .radius(function(d) {
                return d.y - 35;
            })
            .angle(function(d) {
                return d.x / 180 * pi;
            });
        if(reinit && graph.div){
            graph.div.remove();
        }
        graph.div = d3.select(graphSelector).insert("div", "h2")
            .style("width", w + "px")
            .style("height", w + "px")
            .style("margin","0px auto");
        graph.svg = graph.div.append("svg:svg")
            .attr("width", w)
            .attr("height", h)
            .append("svg:g")
            .attr("transform", "translate(" + rx + "," + ry + ")")
            .attr("transform", "rotate(180 " + rx / 2 + " " + ry / 2 + ")")

        graph.svg.append("svg:path")
            .attr("class", "arc")
            .attr("d", d3.svg.arc().outerRadius(ry - 120).innerRadius(0).startAngle(0).endAngle(2 * Math.PI))

        if(!reinit){
            graph.requestData(graph.render);
            $(window).on('resize', function(ev){
                graph.resetPosition();
                graph.init(true);
                graph.render();
            });

            if(refreshInterval){
                setInterval(function(){
                    graph.requestData(function(){
                        graph.init(true);
                        graph.render();
                    });
                }, refreshInterval * 1000);
            }

            $(window).on("mousedown", function(ev){
              m0 = mouseCoordinates(ev);
              ev.preventDefault();
            });
            $(window).on("mousemove", function(ev) {
                if (m0) {
                    var m1 = mouseCoordinates(ev),
                        dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;
                    graph.div.style("-webkit-transform", "translate3d(0," + (ry - rx) + "px,0)rotate3d(0,0,0," + dm + "deg)translate3d(0," + (rx - ry) + "px,0)");
                }
            });
        }
        return this;
    };
    this.render = function() {
        if(graph._data && graph._data.length > 0){
            var rootNodes = nodeHelpers.root(graph._data);
            var nodes = graph.cluster.nodes(rootNodes),
                links = nodeHelpers.imports(nodes),
                splines = graph.bundle(links);

            var groupData = graph.svg.selectAll("g.group")
                .data(nodes.filter(function(d) {
                    return d.host && d.service == d.host && d.children;
                }))
                .enter().append("group")
                .attr("class", "group");

            var groupArc = d3.svg.arc()
                .innerRadius(ry - 185)
                .outerRadius(ry - 160)
                .startAngle(function(d) {
                    return (graph.findStartAngle(d.__data__.children) - 0.25) * pi / 180;
                })
                .endAngle(function(d) {
                    return (graph.findEndAngle(d.__data__.children) + 0.25) * pi / 180
                });

            graph.svg.selectAll("g.arc")
                .data(groupData[0])
                .enter().append("svg:path")
                .attr("d", groupArc)
                .attr("class", "groupArc")
                .style("fill", function(d,i) {
                    return color_arc(i);
                });

            graph.svg.selectAll("g.node")
                .data(nodes.filter(function(n) {
                    return !n.children;
                }))
                .enter().append("svg:g")
                .attr("class", "node")
                .attr("data-node-id", function(d){
                    return d.host;
                })
                .attr("id", function(d) {
                    return nodeHelpers.nodeServiceId(d);
                })
                .attr("transform", function(d) {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                })
                .append("svg:a")

                .append("svg:text")
                .attr("dx", function(d) {
                    return d.x < 180 ? 0 : 0;
                })
                .attr("dy", ".2em")
                .attr("text-anchor", function(d) {
                    return d.x < 180 ? "start" : "end";
                })
                .style("text-anchor", function(d) {
                    return d.x < 180 ? "end" : "start";
                })
                .attr("transform", function(d) {
                    return d.x < 180 ? "rotate(180)" : "rotate(0)";
                })
                .text(function(d) {
                    return d.service;
                })
                .classed("status-success", function(d){ return d.hasOwnProperty("status") && d.status === "success";})
                .classed("status-failed", function(d){ return d.hasOwnProperty("status") && d.status === "failed";})
                .classed("status-unknown", function(d){ return !d.hasOwnProperty("status") || d.status === "unknown";})
                .on("mouseover", function(d) {
                    graph.svg.selectAll("path.link.target-" + d.host.replace(/\./g,"_") + "-" + d.service.replace(/\./g,"_"))
                        .classed("target", true)
                        .each(graph.updateNodes("source", true));

                    graph.svg.selectAll("path.link.source-" + d.host.replace(/\./g,"_") + "-" + d.service.replace(/\./g,"_"))
                        .classed("source", true)
                        .each(graph.updateNodes("target", true));

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d)).classed("selected", true);
                })
                .on("mouseout", function mouseout(d) {
                    graph.svg.selectAll("path.link.source-" + d.host.replace(/\./g,"_") + "-" + d.service.replace(/\./g,"_"))
                        .classed("source", false)
                        .each(graph.updateNodes("target", false))
                        .style("stroke", function(d) {
                            return line_color(d);
                        });

                    graph.svg.selectAll("path.link.target-" + d.host.replace(/\./g,"_") + "-" + d.service.replace(/\./g,"_"))
                        .classed("target", false)
                        .each(graph.updateNodes("source", false))
                        .style("stroke", function(d) {
                            return line_color(d);
                        });

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d)).classed("selected", false);
                });

            var path = graph.svg.selectAll("path.link")
                .data(links)
                .enter().append("svg:a")
                .append("svg:path")
                .attr("class", function(d) {
                    return "link source-" + d.source.host.replace(/\./g,"_") + "-" + d.source.service.replace(/\./g,"_") +" target-" + d.target.host.replace(/\./g,"_") + "-" + d.target.service.replace(/\./g,"_");
                })
                .attr("d", function(d, i) {
                    return graph.line(splines[i]);
                })
                .style("stroke", function(d) {
                    return line_color(d);
                })
                .on("mouseover", function linkMouseover(d) {
                    active_link = ".source-" + d.source.host.replace(/\./g,"_") + "-" + d.source.service.replace(/\./g,"_") + ".target-" + d.target.host.replace(/\./g,"_") + "-" + d.target.service.replace(/\./g,"_");
                    graph.svg.selectAll(active_link).classed("active", true)
                        .style("stroke", "black");

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d.source))
                        .classed("source", true);

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d.target))
                        .classed("target", true);
                })
                .on("mouseout", function linkMouseout(d) {
                    graph.svg.selectAll(active_link).classed("active", false)
                        .style("stroke", function(d) {
                            return line_color(d);
                        });

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d.source))
                        .classed("source", false);

                    graph.svg.select("#" + nodeHelpers.nodeServiceId(d.target))
                        .classed("target", false);
                });
        }
    };

    this.requestData = function(callback){
        d3.json(dataUrl, function(res){
            if(res && res.result === 'ok'){
                graph._data = res.data;
                if(typeof callback === 'function'){
                    callback();
                }
            }else{
                console.log("Cannot create topology graph, server returns error: " + res.data);
            }
        });
    }

    this.resetPosition = function(){
        content_width = $(window).width() - $("#sidebar").width() - 50;
        w = content_width;
        h = content_width;
        rx = w / 2;
        ry = h / 2;
    };

    this.updateNodes = function(name, value) {
        return function(d) {
            if (value) this.parentNode.appendChild(this);
            var selector = nodeHelpers.nodeServiceId(d[name]);
            graph.svg.select("#"+selector).classed(name, value);
        };
    };

    this.findStartAngle = function(children) {
        var min = children[0].x;
        children.forEach(function(d) {
            if (d.x < min)
                min = d.x;
        });
        return min;
    };

    this.findEndAngle = function(children) {
        var max = children[0].x;
        children.forEach(function(d) {
            if (d.x > max)
                max = d.x;
        });
        return max;
    };
};
