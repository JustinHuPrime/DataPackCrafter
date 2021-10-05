# Datapack Crafter Semantics

A datapack consists of an input file. The file has a datapack declaration - this sets the namespace for the namespaced ids associated with the current datapack. The file may also have zero or more expressions.

An expression evaluates to a value, and may, as a side effect, modify the global store. The global store is a mapping between the namespaced id of a advancement, function, or when block, and the contents of that advancement, function, or when block. Additionally, there exists a lexically-scoped environment used to look up identifiers, which may be modified by certain expressions.

At the end of evaluation, the contents of the global store are produced as a Minecraft datapack in the namespace declared above.

## Define Expressions

A define expression defines a (possibly anonymous) DSL-level function, taking a finite number of arguments. The body of the function is evaluated using standard lexical scoping and closure rules. Additionally, when a function is defined, it's enclosing scope is mutated to include a reference to the function (to allow mutual recursion). This produces the function defined by the expression.

## Let Expressions

A let expression defines one or more variable bindings that apply to the enclosed expression. This opens a new lexical scope. This produces the result of evaluating its enclosed expression.

## For Expressions

A for expression acts as a map over a list or string, with the variable being bound to the current element in the list or the current character in the string. This produces a list formed from the results of evaluating its enclosed expression for each value in the input list.

## Print Expressions

A print expression expects any expression, and produces it. As a side effect, the expression is printed at DSL evaluation time.

## Logical Expressions

A logical expression expects two booleans, and performs the standard operation.

## Equality Expressions

Equality expressions expect two values, and perform the standard comparison. Note that values of different types are automatically not equal.

## Relational Expressions

Relational expression perform standard numeric relations when given two numbers, or lexical comparison when given two strings.

## Additive Expressions

Additive expressions perform standard numeric operations when given two numbers, or perform a string-concatenate when adding together two strings. Additionally, if two lists are given, a list-append operation is performed.

Expressions that evaluate to a non-finite value (e.g. by overflowing JavaScript numbers) will throw an error.

## Multiplicative Expressions

Multiplicative expressions perform the standard numeric operation with two numbers.

Expressions that evaluate to a non-finite value (e.g. dividing by 0) will throw an error.

## Prefix Expressions

The unary not and unary negation prefix expressions perform the standard operations.

## Postfix Expressions

The sequence-index expects either a single number, and selects that element from a string (converted into a one-long string) or a list. If it is given an expression followed by a colon, it selects the elements from that index until the end of the sequence. If it is given a colon followed by an expression, it selects the elements from the beginning of the sequence until (but excluding) the given index. If it is given two numbers, it selects the elements from the first index until (but excluding) the second index.

The function-call operator takes a function and some number of values and calls that function using those values.

## Primary Expressions

An expression may be parenthesized.

Square brackets form a list constructor, which expects zero or more expressions and forms a list.

Braces form a begin-expression, which evaluates all but the last expression for side effects only and produces the last expression's value.

An on-expression, as a side effect, creates an internal-use advancement that, when triggered (according to the expression's trigger), evaluates the command(s) defined inside of it. It produces the namespaced id of that internal-use advancement.

An advancement expression, as a side effect, creates an advancement that has the given name and display properties. The name must be a valid Minecraft identifier, but may not begin with a dot. If a name is not given, then a unique identifier is assigned. The name is produced.

A function expression, as a side effect, creates a Minecraft-level function with the given name and commands to run. The name must be a valid Minecraft identifier, but may not begin with a dot. If a name is not given, then a unique identifier is assigned. The name is produced.

## Literals

String literals exist, and use curly braces for string interpolation. They may also include newlines ('cause it's easier to include them than to exclude them).

Numbers, and the boolean constants true and false exist as normal. Numbers are represented internally as floating points.

## Minecraft Interface - Triggers and Commands

### Triggers

Triggers run actions when a certain event happens within Minecraft. Internally, these are implemented using [built-in function tags](https://minecraft.fandom.com/wiki/Function_(Java_Edition)#Tags) for `load` and `tick`, and hidden advancement triggers for all other triggers. For the latter, the hidden advancement is revoked from the player right after it triggers, so that the same event can be triggered multiple times.

Of these, `load` and `tick` are special and cannot be combined together. `load` triggers whenever the datapack loads, and `tick` triggers on every Minecraft game tick. Other triggers are documented on the [Minecraft Wiki](https://minecraft.fandom.com/wiki/Advancement/JSON_format) and can be combined together using an or statement (`||`) - so the on-expression's commands will run when any specified trigger fires.

The typechecked triggers (currently `consume_item` and `inventory_changed`) take item specifications - we'd like to typecheck that the item or tag are valid items, but we can't do that without listing all the items and tags from Minecraft.

The free-form trigger takes a Minecraft trigger name - we'd like to typecheck that it's a valid name, but we can't do that without listing all of the triggers from Minecraft. This also doesn't allow parameters on the trigger.

### Commands

Commands expressions translate to Minecraft commands, which allows for the following subcommands:

- The `grant` command expects a string naming an advancement, and is translated into a command to grant that advancement from the player who fired the trigger event.

- The `revoke` command expects a string naming an advancement, and is translated into a command to revoke that advancement from the player who fired the trigger event.

- An `execute` command expects a string naming a function, and is translated into a command to run that (Minecraft) function.

- The literal command expects a string or list of strings, and is inserted verbatim. No type checks happen.

For the `grant`, `revoke`, and `execute` commands, the function or advancement name must be previously defined in the DSL datapack, unless the name contains a `:`. Names containing a `:` are assumed to refer to another [Minecraft namespace](https://minecraft.fandom.com/wiki/Resource_location#Namespaces), e.g. a 3rd party data pack, and are not validated further.
