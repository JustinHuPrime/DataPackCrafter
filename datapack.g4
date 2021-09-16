grammar datapack;

// Note that the lexer throws out whitespace

file: datapack_decl (expression | command)*;

datapack_decl: 'datapack' ID;

expression:
	'import' expression
	| 'define' ID? '(' (ID (',' ID)*)? ')' expression
	| 'let' ID '=' expression (',' ID '=' expression)* expression
	| 'if' expression 'then' expression 'else' expression
	| 'for' ID 'in' expression expression
	| 'print' expression
	| logical_expression;

logical_expression:
	equality_expression (('&&' | '||') equality_expression)*;

equality_expression:
	relational_expression (('==' | '!=') relational_expression)*;

relational_expression:
	additive_expression (
		('<' | '>' | '<=' | '>=') additive_expression
	)*;

additive_expression:
	multiplicative_expression (
		('+' | '-') multiplicative_expression
	)*;

multiplicative_expression:
	prefix_expression (('*' | '/' | '%') prefix_expression)*;

prefix_expression:
	'!' prefix_expression
	| '-' prefix_expression
	| postfix_expression;

postfix_expression:
	primary_expression (
		(
			'[' expression (':' expression)? ']'
		) // sequence indexing/slicing
		| (
			'(' (expression (',' expression)*)? ')'
		) // function call
	)*;

primary_expression:
	'(' expression ')'
	| '[' expression (',' expression)* ']' // list constructor
	| '{' expression+ '}' // begin
	| 'on' '(' trigger ')' '{' command* '}'
	| 'advancement' expression? '{' advancement_spec* '}'
	| 'function' expression? '{' command* '}'
	| string // literals
	| NUMBER
	| 'true'
	| 'false';

command: // TODO: can make more commands available in type-checked form
	'grant' expression // grant advancement
	| 'revoke' expression // revoke advancement
	| 'execute' expression // execute function
	| expression; // literal command

trigger: 'load' | 'tick' | combined_trigger;
combined_trigger:
	primary_trigger (('&&' | '||') primary_trigger)*;
primary_trigger: // TODO: can add more triggers
	'consume_item' '{' item_specification '}'
	| 'inventory_changed' '{' item_specification '}';

item_specification: // TODO: can expand with more criteria
	'item' '==' expression
	| 'tag' '==' expression;

advancement_spec: // TODO: can add more display properties
	'title' '=' expression
	| 'icon' '=' expression
	| 'description' '=' expression
	| 'parent' '=' expression;

ID: [a-zA-Z][a-zA-Z0-9]*;

NUMBER: '-'? [1-9][0-9]+;

string: '"' (STRING_CHARACTER | '{' expression+ '}')* '"';

STRING_CHARACTER: ~["\\{}] | '\\\\' | '\\"' | '\\{' | '\\}';