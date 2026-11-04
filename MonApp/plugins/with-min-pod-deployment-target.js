/**
 * Xcode 27 (image EAS "latest") refuse toute cible Pods dont la version iOS
 * minimale est < 15.0 (Stripe, Google Sign-In, AppAuth… déclarent encore 9–13).
 * La build échoue alors avec « IPHONEOS_DEPLOYMENT_TARGET is set to 12.0, but
 * the range of supported deployment target versions is 15.0 to 27.1.x ».
 *
 * Ce plugin ajoute, à la fin du post_install du Podfile généré par
 * `expo prebuild`, une remontée de ces cibles à 15.1.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MIN = '15.1';
const MARKER = '# oheve: min pod deployment target';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |bc|
        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN}')
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN}'
        end
      end
    end
`;

module.exports = function withMinPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARKER)) {
        // Après react_native_post_install (qui règle lui-même certaines cibles),
        // juste avant le `end` qui ferme le bloc post_install.
        const start = src.indexOf('post_install do |installer|');
        const close = start === -1 ? -1 : src.indexOf('\n  end', start);
        if (close === -1) {
          throw new Error('with-min-pod-deployment-target : post_install introuvable dans le Podfile');
        }
        src = src.slice(0, close) + SNIPPET.replace(/\n$/, '') + src.slice(close);
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
