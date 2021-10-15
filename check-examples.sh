#!/bin/bash

exitCodeSum=0

for file in examples/*.datapack; do
    npm start -- "$file"
    exitCodeSum+=$?
done

echo

if [[ $exitCodeSum -eq 0 ]]; then
    echo "All examples generated successfully"
else
    echo "Some examples failed to generate (see above console output)"
    exit 1
fi

