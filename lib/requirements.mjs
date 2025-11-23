/*jslint node: true */
"use strict";

import { execSync } from 'child_process';


export function check_requirements() {
    let result = false;
    try {
        const stdout = execSync('which pandoc', { encoding: 'utf8' });
        console.log('Found pandoc:', stdout);
        result = true;
    }
    catch (error) {
        console.error('pandoc could not be found:', error.message);
    }
    return result;
}
