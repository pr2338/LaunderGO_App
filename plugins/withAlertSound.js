// Bundles the order-alert sound played by react-native-sound
// (src/services/notificationService.ts). The native folders are regenerated
// by `expo prebuild` / EAS, so the file has to be added here, not by hand.
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
} = require('@expo/config-plugins');

const SOURCE = 'assets/sound/notification2.mp3';
const FILE_NAME = 'alert_sound.mp3';

const withAndroidSound = config =>
  withDangerousMod(config, [
    'android',
    async cfg => {
      const rawDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/raw');
      fs.mkdirSync(rawDir, { recursive: true });
      fs.copyFileSync(path.join(cfg.modRequest.projectRoot, SOURCE), path.join(rawDir, FILE_NAME));
      return cfg;
    },
  ]);

const withIosSound = config =>
  withXcodeProject(config, cfg => {
    const projectName = cfg.modRequest.projectName;
    const dest = path.join(cfg.modRequest.platformProjectRoot, projectName, FILE_NAME);
    fs.copyFileSync(path.join(cfg.modRequest.projectRoot, SOURCE), dest);

    const filepath = path.join(projectName, FILE_NAME);
    if (!cfg.modResults.hasFile(filepath)) {
      cfg.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath,
        groupName: projectName,
        isBuildFile: true,
        project: cfg.modResults,
      });
    }
    return cfg;
  });

module.exports = config => withIosSound(withAndroidSound(config));
