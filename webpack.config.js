const path = require("path");
const webpack = require("webpack");
const FilemanagerPlugin = require("filemanager-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const viewsPath = path.join(__dirname, "views");
const sourcePath = path.join(__dirname, "src");
const destPath = path.join(__dirname, "extension");
const nodeEnv = process.env.NODE_ENV || "development";
const targetBrowser = process.env.TARGET_BROWSER;

const getExtensionFileType = (browser) => {
  if (browser === "opera") {
    return "crx";
  }

  if (browser === "firefox") {
    return "xpi";
  }

  return "zip";
};

module.exports = {
  devtool: false, // https://github.com/webpack/webpack/issues/1194#issuecomment-560382342

  stats: {
    all: false,
    builtAt: true,
    errors: true,
    hash: true,
  },

  mode: nodeEnv,
  // node: {
  //   // Buffer: false,
  //   process: false,
  // },

  entry: {
    manifest: path.join(sourcePath, "manifest.json"),
    background: path.join(sourcePath, "background", "index.ts"),
    "execute-scripts/sendDrawingDataToSave": path.join(
      sourcePath,
      "execute-scripts",
      "send-drawing-data-to-save.ts"
    ),
    "execute-scripts/loadDrawing": path.join(
      sourcePath,
      "execute-scripts",
      "loadDrawing.ts"
    ),
    "execute-scripts/newDrawing": path.join(
      sourcePath,
      "execute-scripts",
      "newDrawing.ts"
    ),
    "execute-scripts/export-store": path.join(
      sourcePath,
      "execute-scripts",
      "export-store.ts"
    ),
    "execute-scripts/load-store": path.join(
      sourcePath,
      "execute-scripts",
      "load-store.ts"
    ),
    "content-scripts/listenDrawingUpdates": path.join(
      sourcePath,
      "ContentScript",
      "listenDrawingUpdates.ts"
    ),
    popup: path.join(sourcePath, "Popup", "index.tsx"),
    options: path.join(sourcePath, "Options", "index.tsx"),
  },

  output: {
    path: path.join(destPath, targetBrowser),
    filename: "js/[name].bundle.js",
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
    alias: {
      "webextension-polyfill-ts": path.resolve(
        path.join(__dirname, "node_modules", "webextension-polyfill-ts")
      ),
    },
  },

  module: {
    rules: [
      {
        type: "javascript/auto", // prevent webpack handling json with its own loaders,
        test: /manifest\.json$/,
        use: {
          loader: "wext-manifest-loader",
          options: {
            usePackageJSONVersion: true, // set to false to not use package.json version for manifest
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          {
            loader: "css-loader", // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "autoprefixer",
                    {
                      // Options
                    },
                  ],
                ],
              },
            },
          },
          "resolve-url-loader", // Rewrites relative paths in url() statements
          {
            loader: "sass-loader", // Takes the Sass/SCSS file and compiles to the CSS
          },
        ],
      },
    ],
  },

  plugins: [
    // Plugin to not generate js bundle for manifest entry
    new WextManifestWebpackPlugin(),
    // Generate sourcemaps
    new webpack.SourceMapDevToolPlugin({ filename: false }),
    new ForkTsCheckerWebpackPlugin(),
    // environmental variables
    new webpack.EnvironmentPlugin(["NODE_ENV", "TARGET_BROWSER"]),
    // delete previous build files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        path.join(process.cwd(), `extension/${targetBrowser}`),
        path.join(
          process.cwd(),
          `extension/${targetBrowser}.${getExtensionFileType(targetBrowser)}`
        ),
      ],
      cleanStaleWebpackAssets: false,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "popup.html"),
      inject: "body",
      chunks: ["popup"],
      hash: true,
      filename: "popup.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "options.html"),
      inject: "body",
      chunks: ["options"],
      hash: true,
      filename: "options.html",
    }),
    // write css file(s) to build folder
    new MiniCssExtractPlugin({ filename: "css/[name].css" }),
    // copy static assets and external libs
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/assets", to: "assets" },
        { from: "src/external-libs/excalidraw.production.min.js", to: "libs" },
        { from: "node_modules/react/umd/react.production.min.js", to: "libs" },
        {
          from: "node_modules/react-dom/umd/react-dom.production.min.js",
          to: "libs",
        },
        {
          from: "node_modules/react-dom/umd/react-dom.production.min.js",
          to: "libs",
        },
        {
          from: "node_modules/@excalidraw/excalidraw/dist/excalidraw-assets/",
          globOptions: {
            dot: true,
            // The built lib external-libs/exccalidraw.production.js is one single file, no need to copy chunks.
            ignore: ["**/vendor-*.js*", "**/locales/**"],
          },
          to: "assets/excalidraw-assets",
          toType: "dir",
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        // Already minimized, and generates error if minified again.
        exclude: /excalidraw\.production\.min\.js/,
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ["default", { discardComments: { removeAll: true } }],
        },
      }),
      new FilemanagerPlugin({
        events: {
          onEnd: {
            archive: [
              {
                format: "zip",
                source: path.join(destPath, targetBrowser),
                destination: `${path.join(
                  destPath,
                  targetBrowser
                )}.${getExtensionFileType(targetBrowser)}`,
                options: { zlib: { level: 6 } },
              },
            ],
          },
        },
      }),
    ],
  },
};
