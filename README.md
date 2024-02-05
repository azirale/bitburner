# Bitburner

This is a web game playable at https://bitburner-official.github.io/
or https://store.steampowered.com/app/1812820/Bitburner/

The game is an incremental-style, but instead of simply being a clicker the game ui
is a terminal where the player connects to and ""hacks"" company servers to manipulate
accounts and pull money. Money is then used to augment the player to increase
capabilities.

The overall style is retro cyberpunk. It is all 80's-looking terminals combined with
future tech augmentations and dystopian megacorporations and gang warfare.

# Source Structure

The game uses javascript code directly. It imports the code files in your save, and
executes them has part of the game itself.

In-game you start on a "home" server, which permanently saves all your scripts between
remorts. That host name is represented in the "home" folder here, which as all of the
player scripts in it.

# Use

The automated process is set up for a player with all source files through to 13
(this is an in-game endgame concept). If the player has all of these they should
be able to simply `run bootstrap.js` and the scripts will, slowly, hit the endgame
and remort. On remort the bootstrapper will queue itself up to run again, making
for an unending loop.

This is all still in-progress, and needs improvements to reduce the time taken.

Most of the code for this is in `home/unattended/`

# Other Uses

Author is working on intelligence farming (in-game concept), so the `home/intel/`
directory has some elements to help with that.
