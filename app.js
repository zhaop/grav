(function () {

	// Helper functions

	// Convert int to [red, green, blue]
	var intToRgb = function (color) {
		return [
			(color & 0xff0000) >> 16,
			(color & 0x00ff00) >> 8,
			color & 0x0000ff,
		];
	};

	// Convert [red, green, blue] to int
	var rgbToInt = function (rgb) {
		return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
	};

	// Interpolate from color1 to color2, with 0 <= t <= 1
	var interpolateColor = function (color1, color2, t) {
		var c1 = intToRgb(color1);
		var c2 = intToRgb(color2);
		return rgbToInt([
			c1[0]*(1-t) + c2[0]*t,
			c1[1]*(1-t) + c2[1]*t,
			c1[2]*(1-t) + c2[2]*t
		]);
	};

	// Entity: give identity to data
	var Entity = function () {
		this.components = {};
		return this;
	};

	Entity.prototype.addComponent = function (component) {
		this.components[component.name] = component;
		typeof component.initComponent == "function" && component.initComponent();
		return this;
	};

	Entity.prototype.removeComponent = function (component) {
		if (this.components[component.name]) {
			delete this.components[component.name];
		}
		typeof component.destroyComponent == "function" && component.destroyComponent();
		return this;
	};

	var Entities = function(){};		// Entity factory and container (and destructor?)
	Entities.prototype = [];
	Entities.prototype.spawn = function () {
		var entity = new Entity();
		this.push(entity);
		return entity;
	}
	Entities.prototype.kill = function (entity) {
		this.splice(this.indexOf(entity), 1);
		entity.components.forEach(function (component) {
			entity.removeComponent(component);
		});
	}


	// Components: hold data
	var Components = {};

	Components.Camera = function () {
		this.width = window.innerWidth;
		this.height = window.innerHeight;

		this.targetMatter = null;	// Matter component the camera is tracking

		// Will probably remove this once IE11 WebGL gets faster
		var isIE11 = !(window.ActiveXObject) && "ActiveXObject" in window;
		this.renderer = (isIE11
			 ? new PIXI.CanvasRenderer(this.width, this.height, null, null)
			 : new PIXI.autoDetectRenderer(this.width, this.height, null, null, true)
		);

		this.stage = new PIXI.Stage(0x000000);
		this.container = new PIXI.DisplayObjectContainer();
		this.stage.addChild(this.container);

		this.smoothing = 0.05;
		this.x = 0;
		this.y = 0;
		this.scale = 0.01;
		this.targetX = null;
		this.targetY = null;
		this.targetScale = 1;
		this.zoom = 1;
		this.zoomMin = 0.25;
		this.zoomMax = 4;
	};
	Components.Camera.prototype.initComponent = function () {
		var self = this;

		// Have canvas remain fullscreen
		window.onresize = function () {
			self.width = window.innerWidth;
			self.height = window.innerHeight;
			self.renderer.resize(window.innerWidth, window.innerHeight);
		};

		// Disable right click on canvas
		this.renderer.view.oncontextmenu = function () {
			return false;
		};
	};
	Components.Camera.prototype.name = "camera";

	Components.Input = function () {
		;
	};
	Components.Input.prototype.name = "input";

	Components.Position = function () {
		this.x = 0;
		this.y = 0;
	};
	Components.Position.prototype.name = "position";

	Components.Matter = function () {
		this.x = 0;
		this.y = 0;
		this.rot = 0;
		this.vx = 0;
		this.vy = 0;
		this.vmax = Infinity;
		this.ax = 0;
		this.ay = 0;
		this.m = 1;

		this.rotateToHeading = false;
	};
	Components.Matter.prototype.name = "matter";

	Components.Propulsion = function () {
		this.thrust = 0;			// Current thrust (0 to 1)
		this.power = 1;				// Max power
		this.fuel = 1000;			// Current fuel level
		this.capacity = 1000;	// Fuel capacity

		this.graphics = null;	// null when not added to scene
		this.color = 0xe8a200;
		this.height = 15;
		this.bottom = 15;		// Distance from bottom
	};
	Components.Propulsion.prototype.name = "propulsion";

	Components.Health = function () {
		this.value = 100;
		this.max = 100;

		this.graphics = null;	// null when not added to scene
		this.color2 = 0x3da100;	// Healthy
		this.color1 = 0xffff00; // Warning
		this.color0 = 0xeb0000;	// Danger
		
		this.height = 15;
		this.bottom = 0;
	};
	Components.Health.prototype.name = "health";

	Components.Attractable = function () {};
	Components.Attractable.prototype.name = "attractable";

	Components.Attractor = function () {};
	Components.Attractor.prototype.name = "attractor";

	Components.Collidable = function () {};
	Components.Collidable.prototype.name = "collidable";

	Components.Collider = function () {};
	Components.Collider.prototype.name = "collider";

	Components.PathHistory = function () {
		this.graphics = new PIXI.Graphics();
		this.points = [];			// Array of [x, y, thrust] arrays
		this.steps = 300;			// How much history to hold
		this.color = 0x258000;
		this.thrustColor = 0xcc4400;
	};
	Components.PathHistory.prototype.name = "pathHistory";

	Components.PathPrediction = function () {
		this.graphics = new PIXI.Graphics();
		this.points = [];
		this.steps = 300;			// How many steps to advance
		this.color = 0x63994d;
	};
	Components.PathPrediction.prototype.name = "pathPrediction";

	Components.Appearance = function () {
		this.graphics = new PIXI.Graphics();
	};
	Components.Appearance.prototype.name = "appearance";

	Components.ShipAppearance = function () {
		this.size = 20;				// Length of plane
		this.wingspan = 0.6;	// Percentage of size
		this.color = 0xff6666;
		this.thrustColor = 0xffff66;
	};
	Components.ShipAppearance.prototype.name = "shipAppearance";

	Components.StarAppearance = function () {
		this.radius = 0;									// Height of solid body
		this.color = 0x000000;
	};
	Components.StarAppearance.prototype.name = "starAppearance";

	Components.Planet = function () {
		this.spaceports = [];
	};
	Components.Planet.prototype.name = "planet";

	Components.Spaceport = function () {
		this.phi = 0;
		this.planet = null;

		this.padR = 15;

		this.towerDist = 30;
		this.towerBaseR = 5;
		this.towerBaseH = 20;
		this.towerTopR = 11;
		this.towerTopH = 8;

		this.frame = Math.random()*600;
	};
	Components.Spaceport.prototype.name = "spaceport";

	Components.Atmosphere = function () {
		this.color = null;
		this.height = 0;		// Height of atmosphere
		this.canvas = null;	// Needs to be created by graphics
		this.sprite = null;	// Holds the atmosphere texture
	};
	Components.Atmosphere.prototype.name = "atmosphere";


	// Systems: do stuff on data
	var Systems = {};

	Systems.playerInput = function (entities) {

		// Get camera coordinates
		var camera;
		entities.some(function (entity) {
			if (entity.components.camera) {
				camera = entity.components.camera;

				// Listen to mouse wheel (if we're not already doing that)
				if (!window.onwheel) {
					window.onwheel = function (e) {
						if (e.wheelDelta > 0 && camera.zoom >= camera.zoomMin) {
							camera.zoom /= 1.03;
						} else if (e.wheelDelta < 0 && camera.zoom <= camera.zoomMax) {
							camera.zoom *= 1.03;
						}
					};
				}

				return true;
			}
		});

		entities.forEach(function (entity) {
			var input = entity.components.input;
			var matter = entity.components.matter;
			var propulsion = entity.components.propulsion;
			var ship = entity.components.shipAppearance;
			if (!input || !matter || !propulsion || !ship) return;

			// Orient ship towards mouse
			var dx = (mouse.x-camera.width/2)/camera.scale+camera.x - matter.x;
			var dy = (mouse.y-camera.height/2)/camera.scale+camera.y - matter.y;
			matter.rot = Math.atan2(dy, dx);

			// Thrust if mouse down
			propulsion.thrust = (propulsion.fuel >= 0) && (mouse.left ? 1 : mouse.right ? -0.3 : 0);

		});
	};
	
	Systems.physics = function (entities) {
		var G = constants.G, epsilon = constants.epsilon, restitution = constants.restitution, airFriction = constants.airFriction, groundFriction = constants.groundFriction;

		entities.forEach(function (entity) {
			var matter = entity.components.matter;
			if (!matter) return;

			// Reset acceleration
			matter.ax = 0;
			matter.ay = 0;

			// Rotate object to indicate where it's heading if required
			if (matter.rotateToHeading && matter.vx*matter.vx + matter.vy*matter.vy > 0.001) {
				matter.rot += 0.1*(Math.atan2(matter.vy, matter.vx) - matter.rot);
			}

			// Fire da engines
			var propulsion = entity.components.propulsion;
			var health = entity.components.health;
			if (propulsion) {
				if (propulsion.thrust) {
					var rot = matter.rot;
					matter.ax += propulsion.thrust * propulsion.power * Math.cos(rot) / matter.m;
					matter.ay += propulsion.thrust * propulsion.power * Math.sin(rot) / matter.m;
					propulsion.fuel -= Math.abs(propulsion.thrust);
				}
			}

			// Get attracted by other things
			var attractable = entity.components.attractable;
			if (attractable) {
				var ax = 0, ay = 0;
				entities.forEach(function (entity2) {
					var matter2 = entity2.components.matter;
					var attractor = entity2.components.attractor;
					if (!matter2 || !attractor) return;
					if (entity == entity2) return;

					var dx = matter2.x - matter.x;
					var dy = matter2.y - matter.y;
					var r2 = dx*dx + dy*dy + epsilon;
					var r = Math.sqrt(r2);
					ax += G*matter2.m/r2 * dx/r;
					ay += G*matter2.m/r2 * dy/r;
				});
				matter.ax += ax;
				matter.ay += ay;
			}

			// Detect collisions between ship <-> star
			var collider = entity.components.collider;
			var ship = entity.components.shipAppearance;
			if (collider && ship) {
				entities.forEach(function (entity2) {
					var matter2 = entity2.components.matter;
					var spaceport = entity2.components.spaceport;
					if (!matter2) return;

					var dx = matter2.x - matter.x;
					var dy = matter2.y - matter.y;
					var r2 = dx*dx + dy*dy;

					// Deal with the spaceport case then done
					if (spaceport) {
						var pm = spaceport.planet.components.matter;
						var rad = spaceport.planet.components.starAppearance.radius;
						dx = pm.x + Math.cos(spaceport.phi)*rad - matter.x;
						dy = pm.y + Math.sin(spaceport.phi)*rad - matter.y;
						r2 = dx*dx + dy*dy;
						if (r2 <= spaceport.padR*spaceport.padR) {
							if (propulsion) {
								propulsion.fuel = Math.min(propulsion.fuel+1, propulsion.capacity);
							}
							if (health) {
								health.value = Math.min(health.value+0.5, health.max);
							}
						}
						return;
					}


					var star = entity2.components.starAppearance;
					if (!star) return;

					var atmosphere = 0;
					var atmosphereComponent = entity2.components.atmosphere;
					if (atmosphereComponent) {
						atmosphere = atmosphereComponent.height;
					}

					var dmin = ship.size/2 + star.radius + atmosphere;
					if (r2 <= dmin*dmin) {
						// Collision with atmosphere
						var r = Math.sqrt(r2);
						var depth = dmin - r;

						// Atmospheric friction
						if (atmosphere) {
							matter.vx *= 1 - airFriction * depth/atmosphere;
							matter.vy *= 1 - airFriction * depth/atmosphere;
						}
						
						var damage;
						var planet = entity2.components.planet;
						
						if (health) {
							// Take damage if in non-planet atmosphere
							if (!planet && atmosphere) {
								damage = 0.2 * (matter.vx*matter.vx + matter.vy*matter.vy) * depth/atmosphere;
								if (damage > 0.1) {
									health.value -= damage;
								}
							}

							// Take damage if landing with vertical speed too fast
							if (depth >= atmosphere * 0.99) {
								damage = (matter.vx*dx + matter.vy*dy)/r;
								damage *= 5*damage;
								if (damage > 2) {
									// console.log("Taking damage", damage);
									// console.log("Depth", depth);
									// console.log("Velocity", Math.sqrt(matter.vx*matter.vx + matter.vy*matter.vy));
									// console.log("Vspeed", (matter.vx*dx + matter.vy*dy)/r);
									health.value -= damage;
								}
							}
						}

						// On the ground (or hit the ground)
						if (depth > atmosphere + 0.1) {
							var vdelta = 2*(matter.vx * dx + matter.vy * dy) / r2 * restitution;
							matter.vx -= vdelta * dx;
							matter.vy -= vdelta * dy;
							matter.ax -= G*matter2.m/r2 * dx/r * (depth - atmosphere + 1);
							matter.ay -= G*matter2.m/r2 * dy/r * (depth - atmosphere + 1);
							matter.vx *= 1 - groundFriction;
							matter.vy *= 1 - groundFriction;
						}
					}
				});
			}

			var spaceport = entity.components.spaceport;
			if (spaceport) {
				// Follow parent planet
				var planet = spaceport.planet;
				var planetAppearance = planet.components.starAppearance;
				var planetMatter = planet.components.matter;
				if (planetAppearance && planetMatter) {
					var radius = planetAppearance.radius;
					matter.x = planetMatter.x;
					matter.y = planetMatter.y;
					matter.rot = spaceport.phi;
				}
			}

			// Almost Newtonian motion
			matter.vx += matter.ax;
			matter.vy += matter.ay;
			
			// Sanity speed check
			var v = Math.sqrt(matter.vx*matter.vx + matter.vy*matter.vy);
			if (v > matter.vmax) {
				matter.vx *= matter.vmax/v;
				matter.vy *= matter.vmax/v;
			}
			
			matter.x += matter.vx;
			matter.y += matter.vy;
		});
	};

	Systems.plotter = function (entities) {
		entities.forEach(function (entity) {
			var matter = entity.components.matter;
			var pathHistory = entity.components.pathHistory;
			if (!matter || !pathHistory) return;

			var propulsion = entity.components.propulsion;
			var thrust = propulsion ? propulsion.thrust : false;
			var points = pathHistory.points;

			// Append current position & remove old position
			if (points.length >= pathHistory.steps) {
				points.shift();
			}
			points.push([matter.x, matter.y, thrust]);
		})
	};

	Systems.predictor = function (entities) {
		var G = constants.G, epsilon = constants.epsilon, restitution = constants.restitution, airFriction = constants.airFriction, groundFriction = constants.groundFriction;

		entities.forEach(function (entity) {
			var matter = entity.components.matter;
			var pathPrediction = entity.components.pathPrediction;
			if (!matter || !pathPrediction) return;

			var x, y, vx, vy, ax, ay, points;

			// Initial values
			x = matter.x;
			y = matter.y;
			vx = matter.vx;
			vy = matter.vy;
			points = pathPrediction.points;

			// Do many steps of gravity and draw at the same time
			for (var i = 0; i < pathPrediction.steps; ++i) {
				ax = 0;
				ay = 0;
				entities.forEach(function (entity2) {
					var matter2 = entity2.components.matter;
					var attractor = entity2.components.attractor;
					if (!matter2 || !attractor) return;
					if (entity == entity2) return;

					var dx = matter2.x - x;
					var dy = matter2.y - y;
					var r2 = dx*dx + dy*dy + epsilon;
					var r = Math.sqrt(r2);
					ax += G*matter2.m/r2 * dx/r;
					ay += G*matter2.m/r2 * dy/r;
				});

				// Detect collisions between ship <-> star
				var collider = entity.components.collider;
				var ship = entity.components.shipAppearance;
				if (collider && ship) {
					entities.forEach(function (entity2) {
						var matter2 = entity2.components.matter;
						var star = entity2.components.starAppearance;
						if (!matter2 || !star) return;

						var atmosphere = 0;
						var atmosphereComponent = entity2.components.atmosphere;
						if (atmosphereComponent) {
							atmosphere = atmosphereComponent.height;
						}

						var dx = matter2.x - x;
						var dy = matter2.y - y;
						var r2 = dx*dx + dy*dy;
						var dmin = ship.size/2 + star.radius + atmosphere;
						if (r2 <= dmin*dmin) {
							// Collision with atmosphere
							var r = Math.sqrt(r2);
							var depth = dmin - r;

							// Atmospheric friction
							if (atmosphere) {
								vx *= 1 - airFriction * depth/atmosphere;
								vy *= 1 - airFriction * depth/atmosphere;
							}
							
							// Ground repulsion and friction
							if (depth > atmosphere + 0.1) {
								var vdelta = 2*(vx * dx + vy * dy) / r2 * restitution;
								vx -= vdelta * dx;
								vy -= vdelta * dy;
								ax -= G*matter2.m/r2 * dx/r * (depth - atmosphere + 1);
								ay -= G*matter2.m/r2 * dy/r * (depth - atmosphere + 1);
								vx *= 1 - groundFriction;
								vy *= 1 - groundFriction;
							}
						}
					});
				}

				vx += ax;
				vy += ay;
				x += vx;
				y += vy;

				if (!points[i]) points[i] = [];
				points[i][0] = x;
				points[i][1] = y;
			}
		});
	};

	Systems.graphics = function (entities) {

		entities.forEach(function (entity) {

			// If it's a camera, do this special stuff
			var camera = entity.components.camera;
			if (camera) {
				// Know where to go
				var targetMatter = camera.targetMatter;
				camera.targetX = targetMatter.x;
				camera.targetY = targetMatter.y;

				// Scale view with speed of ship
				var v = targetMatter.vx*targetMatter.vx + targetMatter.vy*targetMatter.vy;
				var scaleMin = 0.25;
				var scaleMax = 1;
				camera.targetScale = Math.min(scaleMax, Math.max(scaleMin, 20/v)) / camera.zoom;
				
				// Smoothly move camera
				camera.x += (camera.targetX-camera.x)*camera.smoothing;
				camera.y += (camera.targetY-camera.y)*camera.smoothing;
				camera.scale += (camera.targetScale-camera.scale)*camera.smoothing;

				// Apply the modifications
				camera.container.x = camera.width/2 - camera.x*camera.scale;
				camera.container.y = camera.height/2 - camera.y*camera.scale;
				camera.container.scale.x = camera.container.scale.y = camera.scale;
				camera.renderer.render(camera.stage);
				return;
			}


			// Or if it's got a path history, draw line
			var pathHistory = entity.components.pathHistory;
			if (pathHistory) {
				var points = pathHistory.points;
				var graphics = pathHistory.graphics;
				var steps = pathHistory.steps;
				var color, prevPoint = points[0];

				graphics.x = graphics.y = 0;
				graphics.clear();

				points.forEach(function (point, i) {
					if (i%3 != 1) return;

					// Change color for phases with thrust on
					color = pathHistory.color;
					if (point[2]) {
						color = pathHistory.thrustColor;
					}
					graphics.lineStyle(1.5, color, Math.sin(i/steps*Math.PI/2));
					graphics.moveTo(prevPoint[0], prevPoint[1]);
					graphics.lineTo(point[0], point[1]);

					prevPoint = point;
				});
			}


			// Or if it's got a path prediction, draw dotted lines
			var pathPrediction = entity.components.pathPrediction;
			if (pathPrediction) {
				var points = pathPrediction.points;
				var graphics = pathPrediction.graphics;
				var steps = pathPrediction.steps;

				// Initialize graphics
				graphics.x = graphics.y = 0;
				graphics.clear();
				graphics.moveTo(points[0][0], points[0][1]);
				graphics.lineStyle(1.5, pathPrediction.color, 1);

				points.forEach(function (point, i) {
					var x = point[0], y = point[1];
					if (i%8 == 3) graphics.lineStyle(1.5, pathPrediction.color, 1-0.7*Math.sin(i/steps*Math.PI/2));
					if (i%8 == 4) graphics.moveTo(x, y);
					if (i%8 == 7) graphics.lineTo(x, y);
				});
			}

			// Draw fuel bar (if applicable)
			var propulsion = entity.components.propulsion;
			if (propulsion) {
				if (!propulsion.graphics) {
					propulsion.graphics = new PIXI.Graphics();
					stage.addChild(propulsion.graphics);
				}

				var graphics = propulsion.graphics;
				graphics.x = 0;
				graphics.y = window.innerHeight - propulsion.bottom;
				graphics.clear();
				graphics.beginFill(propulsion.color);
				graphics.drawRect(0, -propulsion.height, window.innerWidth * propulsion.fuel / propulsion.capacity, propulsion.height);
				graphics.endFill();
			}

			// Draw health bar (if applicable)
			var health = entity.components.health;
			if (health) {
				if (!health.graphics) {
					health.graphics = new PIXI.Graphics();
					stage.addChild(health.graphics);
				}

				var fraction = health.value/health.max;
				var color = fraction < 0.5 ? interpolateColor(health.color0, health.color1, fraction*2) : interpolateColor(health.color1, health.color2, fraction*2-1);

				var graphics = health.graphics;
				graphics.x = 0;
				graphics.y = window.innerHeight - health.bottom;
				graphics.clear();
				graphics.beginFill(color);
				graphics.drawRect(0, -health.height, window.innerWidth * fraction, health.height);
				graphics.endFill();
			}

			// If it's matter, also do this
			var matter = entity.components.matter;
			var appearance = entity.components.appearance;
			if (!matter || !appearance) return;

			var ship = entity.components.shipAppearance;
			var star = entity.components.starAppearance;
			var spaceport = entity.components.spaceport;

			var graphics = appearance.graphics;

			if (ship) {
				
				// Redraw everything
				var color = propulsion && propulsion.thrust ? ship.thrustColor : ship.color;
				graphics.clear();
				graphics.beginFill(color);
				graphics.moveTo(ship.size/2, 0);
				graphics.lineTo(-ship.size/2, -ship.size*ship.wingspan/2);
				graphics.lineTo(-ship.size/2, ship.size*ship.wingspan/2);
				graphics.lineTo(ship.size/2, 0);
				graphics.endFill();

				if (propulsion && propulsion.thrust) {
					var scale = Math.random()*0.3 + 0.7;
					var flameW = ship.size*ship.wingspan*0.5 * scale;
					var flameH = ship.size*ship.wingspan*0.8 * scale;
					var iFlameW = 0.5*flameW;
					var iFlameH = 0.5*flameH;
					graphics.beginFill(0xff5500);
					graphics.moveTo(-ship.size/2, -flameW/2);
					graphics.lineTo(-ship.size/2 - flameH, 0);
					graphics.lineTo(-ship.size/2, flameW/2);
					graphics.lineTo(-ship.size/2, -flameW/2);
					graphics.endFill();
					graphics.beginFill(0xffcc00);
					graphics.moveTo(-ship.size/2, -iFlameW/2);
					graphics.lineTo(-ship.size/2 - iFlameH, 0);
					graphics.lineTo(-ship.size/2, iFlameW/2);
					graphics.lineTo(-ship.size/2, -iFlameW/2);
					graphics.endFill();
				}

			} else if (star) {

				var atmosphere = entity.components.atmosphere;

				// Redraw everything too
				graphics.clear();
				graphics.beginFill(star.color);
				graphics.drawCircle(0, 0, star.radius);
				graphics.endFill();

				// Draw gradient for atmosphere too (if not yet drawn)
				if (atmosphere && atmosphere.height > 0 && !atmosphere.canvas) {

					var color = atmosphere.color ? atmosphere.color : star.color;

					var totalRadius = star.radius + atmosphere.height;
					var rgb = intToRgb(color).join(',');

					atmosphere.canvas = document.createElement("canvas");
					atmosphere.canvas.width = totalRadius*2;
					atmosphere.canvas.height = totalRadius*2;

					var ctx = atmosphere.canvas.getContext('2d');
					var grad = ctx.createRadialGradient(totalRadius, totalRadius, star.radius, totalRadius, totalRadius, totalRadius);
					grad.addColorStop(0, "rgba(" + rgb + "," + 1 + ")");
					grad.addColorStop(0.5, "rgba(" + rgb + "," + 0.33 + ")");
					grad.addColorStop(0.75, "rgba(" + rgb + "," + 0.1 + ")");
					grad.addColorStop(1, "rgba(" + rgb + "," + 0 + ")");
					ctx.fillStyle = grad;
					ctx.fillRect(0, 0, totalRadius*2, totalRadius*2);

					ctx.beginPath();
					ctx.arc(totalRadius, totalRadius, star.radius, 0, 2*Math.PI, false);
					ctx.fillStyle = "rgb(" + intToRgb(star.color).join(',') + ")";
					ctx.fill();
					ctx.closePath();

					var sprite = atmosphere.sprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(atmosphere.canvas));
					sprite.width = sprite.height = totalRadius*2;
					sprite.x = sprite.y = -totalRadius;

					if (graphics.children.indexOf(atmosphere.sprite) == -1) {
						graphics.addChild(atmosphere.sprite);
					}
				}
			} else if (spaceport) {

				var radius = spaceport.planet.components.starAppearance.radius;
				if (!radius) console.error("Oh crap", "Here's the spaceport", spaceport);

				graphics.clear();
				graphics.beginFill(0x880000);
				graphics.drawEllipse(-spaceport.padR/8 + radius, 0, spaceport.padR/2, spaceport.padR);
				graphics.endFill();
				graphics.beginFill(0xbbbbbb);
				graphics.drawEllipse(-spaceport.padR/8 + radius, 0, spaceport.padR/2*0.8, spaceport.padR*0.8);
				graphics.endFill();
				graphics.beginFill(0x880000);
				graphics.drawEllipse(-spaceport.padR/8 + radius, 0, spaceport.padR/2*0.125, spaceport.padR*0.125);
				graphics.endFill();

				graphics.beginFill(0x555555);
				graphics.drawEllipse(radius - spaceport.padR/2, spaceport.towerDist, spaceport.towerBaseR/2, spaceport.towerBaseR);
				graphics.drawRect(radius - spaceport.padR/2, spaceport.towerDist - spaceport.towerBaseR, spaceport.towerBaseH, spaceport.towerBaseR*2);
				graphics.endFill();
				graphics.beginFill(0x777777);
				graphics.drawEllipse(radius - spaceport.padR/2 + spaceport.towerBaseH, spaceport.towerDist, spaceport.towerTopR/2, spaceport.towerTopR);
				graphics.drawRect(radius - spaceport.padR/2 + spaceport.towerBaseH, spaceport.towerDist - spaceport.towerTopR, spaceport.towerTopH, spaceport.towerTopR*2);
				graphics.endFill();
				graphics.beginFill(0x999999);
				graphics.drawEllipse(radius - spaceport.padR/2 + spaceport.towerBaseH + spaceport.towerTopH, spaceport.towerDist, spaceport.towerTopR/2, spaceport.towerTopR);
				graphics.endFill();

				if (spaceport.frame%60 < 8) {
					graphics.beginFill(0xff0000);
					graphics.drawCircle(radius - spaceport.padR/2 + spaceport.towerBaseH + spaceport.towerTopH, spaceport.towerDist + spaceport.towerTopR - 1, 1.5);
					graphics.endFill();
				}

				++spaceport.frame;
			}

			// Reposition the thing
			graphics.x = matter.x;
			graphics.y = matter.y;
			graphics.rotation = matter.rot;

		});
	};

	Systems.director = function () {
		;
	};


	// Global variables: roots of data
	var constants, entities, systems, stage, mouse, key, stats, time = 0, running = true;

	// Init code
	var init = window.onload = function () {

		// Prepare systems in the right order
		systems = [
			Systems.playerInput,
			Systems.physics,
			Systems.plotter,
			Systems.predictor,
			Systems.graphics,
		];

		// Define constants
		constants = {
			G: 0.01,			// Gravitational constant
			epsilon: 100,	// Gravitational smoothing
			restitution: Math.sqrt(0.8),	// Collision energy restitution
			airFriction: 0.005,			// Ground friction coefficient
			groundFriction: 0.05,		// Air friction coefficient
		};
		
		// Initialize entities
		entities = new Entities();
		
		// Initialize Pixi
		camera = entities.spawn();
		camera.addComponent(new Components.Camera());
		document.body.appendChild(camera.components.camera.renderer.view);

		stage = camera.components.camera.stage;

		// Keep track of mouse position
		mouse = {x: null, y: null, left: false, right: false};
		window.onmousemove = function (e) {
			mouse.x = e.clientX;
			mouse.y = e.clientY;
		};
		window.onmousedown = function (e) {
			switch (e.button) {
				case 0:
					mouse.left = true;
					break;
				case 2:
					mouse.right = true;
					break;
			}
		};
		window.onmouseup = function (e) {
			switch (e.button) {
				case 0:
					mouse.left = false;
					break;
				case 2:
					mouse.right = false;
					break;
			}
		};

		// Keep track of keys pressed
		key = {space: false, up: false, down: false};
		var keyCodes = [];
		keyCodes[32] = 'space';
		keyCodes[38] = 'up';
		keyCodes[40] = 'down';
		window.onkeydown = function (e) {
			var which = e.which || e.keyCode;
			if (keyCodes[which]) {
				key[keyCodes[which]] = true;
			}
		};
		window.onkeyup = function (e) {
			var which = e.which || e.keyCode;
			if (keyCodes[which]) {
				key[keyCodes[which]] = false;
			}
		};

		// We're going to put everything in here
		var container = camera.components.camera.container;

		var ship = entities.spawn();
		ship.addComponent(new Components.Matter());
		ship.addComponent(new Components.Attractable());
		ship.addComponent(new Components.Collider());
		ship.addComponent(new Components.Propulsion());
		ship.addComponent(new Components.Health());
		ship.addComponent(new Components.PathHistory());
		ship.addComponent(new Components.PathPrediction());
		ship.addComponent(new Components.Appearance());
		ship.addComponent(new Components.ShipAppearance());
		ship.addComponent(new Components.Input());
		ship.components.matter.x = 1550;
		ship.components.matter.y = 350;
		ship.components.matter.vx = 0.9;
		ship.components.matter.vy = -0.9;
		ship.components.matter.vmax = 20;
		ship.components.matter.m = 25;
		camera.components.camera.targetMatter = ship.components.matter;
		// addChild comes after (to ensure highest z-order)

		var lolship = entities.spawn();
		lolship.addComponent(new Components.Matter());
		lolship.addComponent(new Components.Attractable());
		lolship.addComponent(new Components.Collider());
		lolship.addComponent(new Components.PathHistory());
		lolship.addComponent(new Components.Appearance());
		lolship.addComponent(new Components.ShipAppearance());
		lolship.components.matter.x = 2050;
		lolship.components.matter.y = 850;
		lolship.components.matter.vx = -0.8;
		lolship.components.matter.vy = 0.8;
		lolship.components.matter.vmax = 20;
		lolship.components.matter.m = 25;
		lolship.components.matter.rotateToHeading = true;
		lolship.components.shipAppearance.color = 0xaaaaaa;
		lolship.components.pathHistory.color = 0x888888;
		
		var starData = [
			{x: 500, y:600, m:120000, r:200, c:0xffda78, atm:120, atmc:0xffe191},								// Sun
			{x: 1800, y:600, m:60000, r:160, c:0x005ba8, atm:100, atmc:0x47a9ff, planet:true, spaceports:[
				{phi: -2}
			]},	// Earth
			{x: 0, y:-900, m:30000, r:127, c:0x303030, planet:true, spaceports:[
				{phi: 3},
			]},			// Moon
			{x: 100, y:-4000, m:240000, r:500, c: 0xff7777, atm:100},	// Ginormous sun
			{x: -1400, y: -3900, m: 30000, r:127, c:0x44ff44, atm:10, planet:true, spaceports:[
				{phi: 1.7},
			]},	// Random thing
		];
		starData.forEach(function (data) {
			var star = entities.spawn();
			star.addComponent(new Components.Matter());
			star.addComponent(new Components.Attractor());
			star.addComponent(new Components.Collidable());
			star.addComponent(new Components.Appearance());
			star.addComponent(new Components.StarAppearance());
			if (data.atm) star.addComponent(new Components.Atmosphere());
			if (data.planet) star.addComponent(new Components.Planet());

			var matter = star.components.matter;
			var starAppearance = star.components.starAppearance;
			matter.x = data.x;
			matter.y = data.y;
			matter.m = data.m;
			starAppearance.radius = data.r;
			starAppearance.color = data.c;

			var atmosphere = star.components.atmosphere;
			if (atmosphere) {
				atmosphere.height = data.atm;
				atmosphere.color = data.atmc || null;
			}

			container.addChild(star.components.appearance.graphics);

			data.planet && data.spaceports && data.spaceports.forEach(function (spaceportData) {
				var spaceport = entities.spawn();
				spaceport.addComponent(new Components.Matter());
				spaceport.addComponent(new Components.Appearance());
				spaceport.addComponent(new Components.Spaceport());
				spaceport.components.spaceport.phi = spaceportData.phi;
				spaceport.components.spaceport.planet = star;
				container.addChild(spaceport.components.appearance.graphics);
			});
		});

		container.addChild(lolship.components.pathHistory.graphics);
		container.addChild(lolship.components.appearance.graphics);
		container.addChild(ship.components.pathHistory.graphics);
		container.addChild(ship.components.pathPrediction.graphics);
		container.addChild(ship.components.appearance.graphics);

		stats = new Stats();
		stats.domElement.style.position = "absolute";
		stats.domElement.style.left = "0";
		stats.domElement.style.top = "0";
		document.body.appendChild(stats.domElement);

		// loop();
	};

	window.go = function () {
		document.getElementById('intro').style.display = 'none';
		loop();
	};

	var loop = function () {
		stats.begin();

		systems.forEach(function (system) {
			system(entities);
		});

		++time;

		if (running) {
			requestAnimationFrame(loop);
		}

		stats.end();
	};
})();
