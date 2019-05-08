# Gmvault Webreader

A web interface for browsing, reading and ever-so-slowly searching through Gmvault backups that look something like this:

    |-- 2006-01
    |   |-- 123456788.eml.gz
    |   +-- 123456789.eml.gz
    |   +-- ...
    |-- 2006-02
    |   |-- 223456788.eml.gz
    |   |-- 223456789.eml.gz
    |   |-- ...
    |-- ...
    |   |-- ...

Nothing will be extracted (except in memory) for searching and navigation, rendering the whole thing pretty damn slow. On the bright side, it doesn't eat up a bunch of unnecessary\* space or resources because of this.

(\* I mean it's still a Node.js application...)

## Installation

- [Use the Docker image!](https://github.com/kbadk/gmvault-webreader-docker)

Or:

- Download (and extract) or clone this repository.
- Install dependencies: `npm install --production`.
- Set `mailRoot` to point to your Gmvault backup directory in `config.js`.
- Start the thing: `npm start`.
- Point your browser at http://localhost:6114/.

### Other configurations

Instead of fiddling with `config.js`, you can also just define environment variables like this:

    MAIL_ROOT=/path/to/backups npm start

If you want this thing to run behind a reverse proxy (and you should), you can also define the sub directory it'll be residing at, or you can change the port. Just check out the `config.js` file.

If you want to run it running at `http://localhost/mail/`, you'd set up Nginx somewhat like this:

    server {
    	listen 80;

    	location /mail {
    		proxy_pass http://localhost:6114;
    		proxy_http_version 1.1;
    		proxy_set_header Upgrade $http_upgrade;
    		proxy_set_header Connection "Upgrade";
    	}
    }

And Gmvault Webreader with

    WEB_ROOT=/mail/ MAIL_ROOT=/path/to/backups npm start
