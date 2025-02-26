if [ ! -z "${GITHUB_TOKEN}" ]; then
  echo "Replacing git SSH urls with HTTPS using GITHUB_TOKEN..."
  git config --global url."https://$GITHUB_TOKEN@github.com/".insteadOf "git@github.com:"
fi
git submodule init
git submodule update
