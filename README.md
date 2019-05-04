# Installation

Install prerequisites and packages:

```
apt install nodejs
apt install yarn
apt install mongodb
yarn
```

Add `127.0.01 mongo` to your `/etc/hosts` file.

Optionally (not recommended on WSL; though see https://github.com/Microsoft/WSL/issues/2291#issuecomment-477632663 and use `sudo` / root for your `docker` commands if you insist on running Docker on WSL, but know it's a poor idea):

`apt install docker.io`

Then, depending on whether you want to use Docker or not:

```
# non-Docker:
yarn br

# Docker:
docker build .
docker run <id>
```

Now, navigate to http://localhost:3000/ and marvel at your creation.

**Note**: Despite being part of the new user workflow, the `staff` user doesn't initially exist locally, unless you create it with a haxx. Signing up as `staff` in your local instance may work for some purposes (without guarantees) iff you change the UID to `5a0ea8429adb2100146f7568` in the mongo console: https://stackoverflow.com/a/4012997/245790 - however, private messages are a no-go, due to the encryption schlaugh sensibly uses.