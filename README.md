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

# Installation

Install it using npm.

    npm install -g stagen

# Usage

Go to site source root directory and issue build command.

    cd /path/of/site/root
    stagen build

The subdirectory `site` will contain output files. Serve that directory with your webserver.
