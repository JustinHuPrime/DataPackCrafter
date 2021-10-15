# DataPackCrafter Language Basics

**DataPackCrafter** is a domain-specific language (DSL) that generates [data packs](https://minecraft.fandom.com/wiki/Data_pack) for Minecraft (Java Edition). For those unfamiliar with the concept, data packs are a lightweight, JSON-based method of customizing the game without having to change the game's source code. In practice though, the data pack format is designed for machine-readability and not necessarily the most convenient to write, as all the necessary code is split between many files.

## General structure

DataPackCrafter implements a [functional language](https://en.wikipedia.org/wiki/Functional_programming) with interaction with Minecraft implemented using side effects. All code expressions evaluate to a value - [semantics.md](semantics.md) explains further what is produced in specific cases (e.g. `on` blocks evaluate to the name of the generated internal advancement trigger)

Data packs in our language start with an ID declaration, and are followed by any number of expressions.

```
datapack example

# This is a comment
print "Hello world"
```

## Types and basic operations

Our language supports the following types: strings, numbers (a single type like in JavaScript), booleans, and (mixed-type) lists.

The standard operators for arithmetic (`+`, `-`, `*`, `/`, `%`), equality (`==`, `!=`), and comparison (`>`, `>=`, `<=`, `<`) are provided with type checks. Of these, `+` allows adding numbers as well as concatenating strings and lists, and comparisons are defined for both numbers and strings.

```
datapack example

print 2 + 2
print "Hi " + "there"
print (5*2) == 10  # -> true
print 1*2 > 3*4    # -> false
```

## Variables, lists, and string interpolations

You can define variables with `let` blocks, which create new scopes with the variable(s) added:

```
let x = 2+2, y = 3 {
    print x+1  # 5
    let myList = ["hello", "world", 1, 2, y, x, x+1] {
        print myList[0]
        print myList[2:6]
    }
}
```

Lists can be indexed (non-negative indices only) with `lst[idx]` as well as sliced:

- `lst[startIdx:]` returns the list from `startIdx` onwards
- `lst[:endIdx]` returns all elements up to (but not including) `endIdx`
- `lst[startIdx:endIdx]` returns all elements between `startIdx` and `endIdx` (not including the latter)

String interpolation is also supported using the syntax `"abcd{some_code}"`:

```
let x = 410 {
    print "CPSC {x}" # -> "CPSC 410"
}
```

## Functions and control flow

DataPackCrafter supports `if` statements as well as functions with recursion. This example returns factorials, for instance:

```
datapack example_factorial

define factorial(num) {
    if (num <= 0) then {
        1
    } else {
        factorial (num - 1) * num
    }
}

print factorial(3)        # -> 6
print factorial(5)        # -> 120
print factorial("splat")  # -> Type error
```

Notice that because this is a functional language, there are no explicit return statements - the values produced by the function are what the function calls evaluate to.

For expressions are also supported: these map some code over each element in a list, and returns a new list of all the produced results.

```
for x in [1,2,3] {
    print x*10  # prints 10, 20, then 30
}

print for x in [1,2,3] { x*10 }  # prints [10, 20, 30] all at once
```

## Interacting with Minecraft

Currently, DataPackCrafter supports creating custom [advancements](https://minecraft.fandom.com/wiki/Advancement/JSON_format#File_format), Minecraft [functions](https://minecraft.fandom.com/wiki/Function_(Java_Edition)), and listening to game events using [built-in advancement triggers](https://minecraft.fandom.com/wiki/Advancement/JSON_format#List_of_triggers). For advancement triggers, we support the `item` and `tag` constraints for `consume_item` and `inventory_changed` (typechecked triggers) - everything else is passed to Minecraft verbatim (as a raw trigger) and does not yet allow for specifying further conditions. We additionally support `load` as a trigger, which is implemented by listening to a [function tag](https://minecraft.fandom.com/wiki/Tag#Function_tags)

### Advancement triggers

Advancement triggers are defined using the `on` expression, which has a [command expression](#Command_expressions) as the contents. Typechecked triggers can also be OR'ed together to e.g. allow for matching multiple items:

Example: **chickens_float.datapack**

```
datapack chickens_float

on (consume_item{item == "chicken"} || consume_item{item == "cooked_chicken"}) {
  "effect give @s slow_falling 10"
}
```

Raw triggers on the other hand, are specified as a raw string (they should include the `minecraft:` namespace prefix too)

Example: **lifesteal.datapack**

```
datapack lifesteal

on ("minecraft:player_killed_entity") {
  "effect give @s regeneration 5"
  "tellraw @s \"Gained health from killing a mob\""
}
```

### Custom advancements

DataPackCrafter allows specifying custom advancements which can be granted or revoked. These may be internal (invisible) advancements, or those that have a display in the game. A bare, invisible advancement defines no fields:

```
datapack existence_of_advancement

advancement ("some_advancement") {}
```

A displayed advancement on the other hand must include the `title`, `description`, and `icon` fields (see below). They can optionally include a `parent` advancement too, for display in the advancement tree.

### Command expressions

DataPackCrafter command expressions translate to Minecraft commands. Currently, DataPackCrafter implements three checked commands (`grant`, `revoke`, `execute`) which aim to make certain simple tasks easier, while also allowing you to pass raw commands to Minecraft.

`grant`, `revoke`, and `execute` are specified as bare subcommands. `grant` and `revoke` grant and revoke Minecraft advancements, and thus expect an advancement name. Unless the name includes a `:`, DataPackCrafter will check that the advancement actually exists in the datapack. References to advancements defined in the base game or another data pack are done using explicit [namespaced]((https://minecraft.fandom.com/wiki/Resource_location#Namespaces)) references instead (e.g. `minecraft:arbalistic`). `execute` runs a Minecraft [functions](https://minecraft.fandom.com/wiki/Function_(Java_Edition)) and behaves similarly, expecting a function name instead.

Example: **granting_advancement_onload.datapack**

```
datapack granting_advancement_onload

advancement ("test_advancement") {
  title="Hello world!"
  description="Test advancement"
  icon="apple"
  parent="minecraft:story/root"
}

on (load) {
  grant "test_advancement"
}
```

On the other hand, raw commands are specified using a bare string or list of strings. This means you can also generate multiple commands using something like `for` expressions:

Example: **starter_kit.datapack**

```
datapack starter_kit

# On load is not actually a reliable way to do this - this is just an example
on (load) {
  for tool in ["stone_sword", "stone_pickaxe", "stone_shovel", "stone_axe"] {
    "give @p {tool}"
  }
}

```
