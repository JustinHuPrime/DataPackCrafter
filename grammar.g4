grammar datapack;

file: datapack_decl import_decl* bodies*;

datapack_decl: 'datapack' id ';';

import_decl: 'import' string ';';

bodies: = { body };
body: = description | icon | expression | definition;

description: = description, simple_string,;;

icon: = icon, path_string,;;

expression_stmt: = expression,;;

expression:
	= advancement
	| function
	| modifier
	| loot_table
	| predicate
	| recipe
	| structure
	| tag
	| dimension
	| dimension_type
	| worldgen
	| let
	| lambda;

advancement: = ...;

function: = ...;

modifier: = ...;

loot_table: = ...;

predicate: = ...;

recipe: = ...;

structure: = structure, path_string,;;

tag: = ...;

dimension: = ...;

dimension_type: = ...;

worldgen: = ...;

let: = ...;

lambda: = ...;

definition: = ...;