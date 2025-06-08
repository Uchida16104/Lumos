class Lumos < Formula
  desc "Lumos CLI language interpreter"
  homepage "https://lumos-language.glitch.me"
  url "https://github.com/Uchida16104/Lumos/archive/refs/heads/main.zip"
  version "1.0.0"
  sha256 "3a640194505e955c8859d15e48085045128efff3e6c93db146df933d1e3e77d1"
  depends_on "node"

  def install
    bin.install "index.js" => "lumos"
    chmod 0755, bin/"lumos"
  end
end
