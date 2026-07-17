const fedoraCommands = [
  "dnf -y upgrade",
  "dnf install -y nginx",
  "dnf install -y dnf-plugins-core",
  "dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo",
  "dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
  "systemctl enable --now docker",
];

const centosCommands = [
  "dnf -y upgrade",
  "dnf install -y nginx",
  "dnf install -y dnf-plugins-core",
  "dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo",
  "dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
  "systemctl enable --now docker",
];

const rhelCommands = [
  "dnf -y upgrade",
  "dnf install -y nginx",
  "dnf install -y dnf-plugins-core",
  "dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo",
  "dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",
  "systemctl enable --now docker",
];

const amazonLinux2023Commands = [
  "dnf -y upgrade",
  "dnf install -y nginx docker",
  "systemctl enable --now docker",
];

const amazonLinux2Commands = [
  "yum -y update",
  "amazon-linux-extras install -y docker",
  "yum install -y nginx",
  "systemctl enable --now docker",
];

const debianCommands = [
  "env DEBIAN_FRONTEND=noninteractive apt-get update",
  "env DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
  "env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx ca-certificates curl",

  "install -m 0755 -d /etc/apt/keyrings",
  "curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc",
  "chmod a+r /etc/apt/keyrings/docker.asc",

  `tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF`,

  "env DEBIAN_FRONTEND=noninteractive apt-get update",
  "env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",

  "systemctl enable --now docker",
];

const ubuntuCommands = [
  "env DEBIAN_FRONTEND=noninteractive apt-get update",
  "env DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
  "env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx ca-certificates curl",

  "install -m 0755 -d /etc/apt/keyrings",
  "curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc",
  "chmod a+r /etc/apt/keyrings/docker.asc",

  `tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "\${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF`,

  "env DEBIAN_FRONTEND=noninteractive apt-get update",
  "env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin",

  "systemctl enable --now docker",
];

export function getInitCommands(os: string, version: string): string[] {
  switch (os) {
    case "ubuntu":
      return ubuntuCommands;

    case "debian":
      return debianCommands;

    case "fedora":
      return fedoraCommands;

    case "centos":
      return centosCommands;

    case "rhel":
    case "rocky":
    case "almalinux":
    case "oracle":
      return rhelCommands;

    case "amzn":
      return version === "2"
        ? amazonLinux2Commands
        : amazonLinux2023Commands;

    default:
      throw new Error(`Unsupported OS: ${os} ${version}`);
  }
}
