/* global module, root */

// -- modules
var fs = require("fs");
var path = require("path");
var webpack = require("webpack");
var header = require("string-template");
var glob = require("glob");

// -- plugins
var DefineWebpackPlugin = webpack.DefinePlugin;
var ExtractTextWebPackPlugin = require("extract-text-webpack-plugin");
var BannerWebPackPlugin = webpack.BannerPlugin;
var UglifyJsWebPackPlugin = require("uglifyjs-webpack-plugin");
// var UglifyJsWebPackPlugin = webpack.optimize.UglifyJsPlugin;
var ReplaceWebpackPlugin = require("replace-bundle-webpack-plugin");
var JsDocWebPackPlugin = require("jsdoc-webpack-plugin");
var HandlebarsPlugin = require("../scripts/webpackPlugins/handlebars-plugin");
var HandlebarsLayoutPlugin = require("handlebars-layouts");
var CopyWebpackPlugin = require("copy-webpack-plugin");

// -- performances
var SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
var smp = new SpeedMeasurePlugin();

// -- variables
var ROOT = path.join(__dirname, "../..");
var date = new Date().toISOString().split("T")[0];
var pkg = require(path.join(ROOT, "package.json"));

module.exports = env => {
    // environnement d'execution
    var production = (env) ? env.production : false;
    var development = (env) ? env.development : false;

    var _mode = (production) ? "" : (development) ? "-map" : "-src";

    return smp.wrap({
        entry : {
            "GpPluginOpenLayers" : path.join(ROOT, "src", "OpenLayers", "GpPluginOpenLayers.js")
        },
        output : {
            path : path.join(ROOT, "dist", "openlayers"),
            filename : "[name]" + _mode + ".js",
            library : "Gp",
            libraryTarget : "umd",
            umdNamedDefine : true
        },
        resolve : {
            alias : {
                // ol : path.resolve(ROOT, "node_modules", "ol", "index.js"),
                olms : path.resolve(ROOT, "node_modules", "ol-mapbox-style", "olms.js"),
                "geoportal-access-lib" : path.resolve(ROOT, "node_modules", "geoportal-access-lib", "src", "Gp.js"),
                proj4 : path.resolve(ROOT, "node_modules", "proj4", "dist", (production) ? "proj4.js" : "proj4-src.js"),
                sortablejs : path.resolve(ROOT, "node_modules", "sortablejs", (production) ? "Sortable.min.js" : "Sortable.js"),
                eventbusjs : path.resolve(ROOT, "node_modules", "eventbusjs", (production) ? "lib" : "src", (production) ? "eventbus.min.js" : "EventBus.js")
            }
        },
        externals : {
            ol : {
                commonjs : "ol",
                commonjs2 : "ol",
                amd : "ol",
                root : "ol"
            },
            request : {
                commonjs2 : "request",
                commonjs : "request",
                amd : "require"
            },
            xmldom : {
                commonjs2 : "xmldom",
                commonjs : "xmldom",
                amd : "require"
            }
        },
        devtool : (development) ? "eval-source-map" : false,
        module : {
            rules : [
                {
                    test : /\.js$/,
                    include : [
                        path.join(ROOT, "src", "Common"),
                        path.join(ROOT, "src", "OpenLayers")
                    ],
                    exclude : /node_modules/,
                    use : {
                        loader : "babel-loader",
                        options : {
                            presets : ["env"]
                        }
                    }
                },
                {
                    test : /\.js$/,
                    enforce : "pre",
                    include : [
                        path.join(ROOT, "src", "Common"),
                        path.join(ROOT, "src", "OpenLayers")
                    ],
                    exclude : [
                        /node_modules/,
                        path.resolve(ROOT, "src", "OpenLayers", "CSS"),
                    ],
                    use : [
                        {
                            loader : "eslint-loader",
                            options : {
                                emitWarning : true
                            }
                        }
                    ]
                },
                {
                    test : require.resolve("proj4"),
                    use : [{
                        loader : "expose-loader",
                        options : "proj4"
                    }]
                },
                {
                    /** FIXME est ce utile ? */
                    test : path.resolve(ROOT, "node_modules", "ol-mapbox-style", "dist", "olms.js"),
                    use : "exports-loader?olms"
                },
                {
                    test : /\.css$/,
                    include : [
                        path.join(ROOT, "src", "Common", "CSS"),
                        path.join(ROOT, "src", "OpenLayers", "CSS")
                    ],
                    exclude : /node_modules/,
                    use : ExtractTextWebPackPlugin.extract({
                        fallback : {
                            loader : "style-loader",
                            options : {
                                sourceMap : false
                            }
                        },
                        use : {
                            loader : "css-loader",
                            options : {
                                sourceMap : false, // FIXME ?
                                minimize : (production) ? true : false
                            }
                        }
                    })
                },
                {
                    test : /\.(png|jpg|gif|svg)$/,
                    loader : "url-loader",
                    exclude : /node_modules/
                }
            ]
        },
        plugins : [
            /** REPLACEMENT DE VALEURS */
            new ReplaceWebpackPlugin(
                [
                    {
                        partten : /__GPOLEXTVERSION__/g,
                        /** replacement de la clef __GPVERSION__ par la version du package */
                        replacement : function () {
                            return pkg.olExtVersion;
                        }
                    },
                    {
                        partten : /__GPDATE__/g,
                        /** replacement de la clef __GPDATE__ par la date du build */
                        replacement : function () {
                            return date;
                        }
                    },
                    {
                        partten : /__GPVERSION__/g,
                        /** replacement de la clef __GPVERSION__ par la version du package */
                        replacement : function () {
                            return pkg.dependencies["geoportal-access-lib"];
                        }
                    }
                ]
            ),
            /** GESTION DU LOGGER */
            new DefineWebpackPlugin({
                __PRODUCTION__ : JSON.stringify(production)
            }),
            /** GENERATION DE LA JSDOC */
            new JsDocWebPackPlugin({
                conf : path.join(ROOT, "build/jsdoc/jsdoc-openlayers.json")
            }),
            /** CSS / IMAGES */
            new ExtractTextWebPackPlugin("[name]" + _mode + ".css"),
            /** HANDLEBARS TEMPLATES */
            new HandlebarsPlugin(
                {
                    entry : {
                        path : path.join(ROOT, "samples-src", "pages", "openlayers"),
                        pattern : "**/*-bundle-*.html"
                    },
                    output : {
                        path : path.join(ROOT, "samples", "openlayers"),
                        flatten : false,
                        filename : "[name]" + _mode + ".html"
                    },
                    helpers : [
                        HandlebarsLayoutPlugin
                    ],
                    partials : [
                        path.join(ROOT, "samples-src", "templates", "openlayers", "*.hbs"),
                        path.join(ROOT, "samples-src", "templates", "partials", "*.hbs"),
                        path.join(ROOT, "samples-src", "templates", "partials", "openlayers", "*.hbs")
                    ],
                    context : [
                        path.join(ROOT, "samples-src", "config.json"),
                        {
                            mode : _mode,
                            debug : (production) ? "" : "-debug"
                        }
                    ]
                }
            ),
            /** TEMPLATES INDEX */
            new HandlebarsPlugin(
                {
                    entry : path.join(ROOT, "samples-src", "pages", "index-openlayers.html"),
                    output : {
                        path : path.join(ROOT, "samples"),
                        filename : "[name]" + _mode + ".html"
                    },
                    context : {
                        samples : () => {
                            var _root = path.join(ROOT, "samples-src", "pages", "openlayers");
                            var list = glob.sync(path.join(_root, "**", "*-bundle-*.html"));
                            list = list.map(function (filePath) {
                                var relativePath = path.relative(_root, filePath);
                                var label = relativePath.replace("/", " -- ");
                                var pathObj = path.parse(relativePath);
                                return {
                                    filePath : path.join("openlayers", pathObj.dir, pathObj.name.concat(_mode).concat(pathObj.ext)),
                                    label : label
                                };
                            });
                            return list;
                        }
                    }
                }
            ),
            /* RESOURCES COPY FOR SAMPLES */
            new CopyWebpackPlugin([
                {
                    from : path.join(ROOT, "samples-src", "resources", "**/*"),
                    to : path.join(ROOT, "samples", "resources"),
                    context : path.join(ROOT, "samples-src", "resources")
                }
            ])
        ]
            /** MINIFICATION */
            .concat(
                (production) ? [
                    new UglifyJsWebPackPlugin({
                        uglifyOptions : {
                            output : {
                                comments : false,
                                beautify : false
                            },
                            mangle : true,
                            warnings : false,
                            compress : false
                        }
                    })] : []
            )
            /** AJOUT DES LICENCES */
            .concat([
                new BannerWebPackPlugin({
                    banner : fs.readFileSync(path.join(ROOT, "build/licences", "licence-proj4js.txt"), "utf8"),
                    raw : true
                }),
                new BannerWebPackPlugin({
                    banner : fs.readFileSync(path.join(ROOT, "build/licences", "licence-es6promise.txt"), "utf8"),
                    raw : true
                }),
                new BannerWebPackPlugin({
                    banner : fs.readFileSync(path.join(ROOT, "build/licences", "licence-eventbusjs.txt"), "utf8"),
                    raw : true
                }),
                new BannerWebPackPlugin({
                    banner : fs.readFileSync(path.join(ROOT, "build/licences", "licence-sortable.txt"), "utf8"),
                    raw : true
                }),
                new BannerWebPackPlugin({
                    banner : fs.readFileSync(path.join(ROOT, "build/licences", "licence-olms.txt"),"utf8"),
                    raw : true
                }),
                new BannerWebPackPlugin({
                    banner : header(fs.readFileSync(path.join(ROOT, "build/licences", "licence-ign.tmpl"), "utf8"), {
                        __BRIEF__ : pkg.olExtName,
                        __VERSION__ : pkg.olExtVersion,
                        __DATE__ : date
                    }),
                    raw : true,
                    entryOnly : true
                })
            ])
    });
};