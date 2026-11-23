const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Native build output changes constantly during assembleRelease. Metro does not
// need to watch these folders, and watching them can crash the file watcher
// when Gradle removes temporary CMake directories.
const nativeBuildPaths = [
  /[\\/]android[\\/]build[\\/].*/,
  /[\\/]android[\\/]\.gradle[\\/].*/,
  /[\\/]android[\\/]app[\\/]build[\\/].*/,
  /[\\/]android[\\/].*[\\/]\.cxx[\\/].*/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]build[\\/].*/,
  /[\\/]node_modules[\\/].*[\\/]android[\\/]\.cxx[\\/].*/,
];

const previousBlockList = config.resolver.blockList;
config.resolver.blockList = new RegExp(
  `(${previousBlockList.source}|${nativeBuildPaths
    .map((pattern) => pattern.source)
    .join('|')})`,
);

module.exports = config;
