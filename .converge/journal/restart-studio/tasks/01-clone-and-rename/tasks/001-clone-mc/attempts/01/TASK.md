# Task: 01-clone-and-rename/001-clone-mc

Clone `https://github.com/builderz-labs/mission-control` at commit `a020d1b7d045e0e09616663ffb39963f432a3f4c` into `packages/studio/`.

```bash
mkdir -p /tmp/mc-fork && rm -rf /tmp/mc-fork/mission-control
cd /tmp/mc-fork
git clone https://github.com/builderz-labs/mission-control
cd mission-control
git checkout a020d1b7d045e0e09616663ffb39963f432a3f4c
echo "a020d1b7d045e0e09616663ffb39963f432a3f4c" > UPSTREAM_SHA
rm -rf .git
mkdir -p /Users/minh/Documents/converge/packages/studio
cp -R . /Users/minh/Documents/converge/packages/studio/
```