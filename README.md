# About

Stagen is a static site generator written JavaScript to work on nodejs environment. Originally it was written to overcome many limitations of Jekyll.

## Features

* Twig template
* Built in support for different content types like Post, Page, Listing Page, Feed.
* Reusable themes
* Menus
* JS/CSS Libraries
* Theme settings

# Releases

Stagen in still in active development and a stable release is not yet made.

# Requirements

Stagen requires Node.js and pandoc.

## Node.js

Pre-build binary packagers are available for [download from NodeJS official site.](https://nodejs.org/en/download/)

You can use [NVM](https://github.com/creationix/nvm) on Linux and Mac OS platforms to install different NodeJS versions same time.

## Pandoc

Please refer official [documentation page](http://pandoc.org/installing.html) for installing pandoc in your system.

# Installation

Install it globally using npm.

    npm install -g stagen

# Usage

Go to site source root directory and issue build command.

    cd /path/of/site/root
    stagen build

The subdirectory `site` will contain output files. Serve that directory with your webserver.
