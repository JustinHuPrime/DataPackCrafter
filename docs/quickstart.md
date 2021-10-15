# DataPackCrafter Language Basics

**DataPackCrafter** is a domain-specific language (DSL) that generates [data packs](https://minecraft.fandom.com/wiki/Data_pack) for Minecraft (Java Edition). For those unfamiliar with the concept, data packs are a lightweight, JSON-based method of customizing the game without having to change the game's source code. In practice though, the data pack format is designed for machine-readability and not necessarily the most convenient to write, as all the necessary code is split between many files.

## File structure

Data packs in our language start with an ID declaration, and are followed by any number of expressions.

```
datapack example

# This is a comment
print "Hello world"
```

## Types and basic operations

Our language supports the following types: numbers (a single type like in JavaScript), booleans, and (mixed-type) lists.

The standard operators for arithmetic (`+`, `-`, `*`, `/`, `%`), equality (`==`, `!=`), and comparison (`>`, `>=`, `<=`, `<`) are provided with type checks. Of these, `+` allows adding numbers as well as concatenating strings and lists, and comparisons are defined for both numbers and strings.

```
datapack example

print 2 + 2
print "Hi " + "there"
print (5*2) == 10  # -> true
print 1*2 > 3*4    # -> false
```

## Variables, lists, and string interpolations

You can define variables with `let` blocks, which each create a new scope:

```
let x = 2+2, y = 3 {
    print x+1  # 5
    let myList = ["hello", "world", 1, 2, y, x, x+1] {
        print myList[0]
        print myList[2:6]
    }
}
```

Lists can be indexed (non-negative indices only) with `lst[idx]` or sliced:

- `lst[startIdx:]` returns the list from `startIdx` onwards
- `lst[:endIdx]` returns all elements up to (but not including) `endIdx`
- `lst[startIdx:endIdx]` returns all elements between `startIdx` and `endIdx` (not including the latter)

String interpolation is also supported using the syntax `"abcd{some_code}`:

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

## Interacting with Minecraft

TODO
