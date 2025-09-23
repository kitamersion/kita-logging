with (import <nixpkgs> { config.allowUnfree = true; });
mkShell {
  shellHook = ''
  '';
  buildInputs = [
    nodejs_20
  ];
}
