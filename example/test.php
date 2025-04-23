<?php
// Example PHP file to test the Jump to PHP Definition extension

// Define a class
class Person {
    // Define properties
    private $name;
    private $age;

    // Constants
    const MIN_AGE = 0;
    const MAX_AGE = 120;

    // Constructor
    public function __construct($name, $age) {
        $this->name = $name;
        $this->age = $age;
    }

    // Methods
    public function getName() {
        return $this->name;
    }

    public function getAge() {
        return $this->age;
    }

    public function setName($name) {
        $this->name = $name;
    }

    public function setAge($age) {
        if ($age >= self::MIN_AGE && $age <= self::MAX_AGE) {
            $this->age = $age;
        }
    }
}

// Create a function
function createPerson($name, $age) {
    // Create a variable
    $person = new Person($name, $age);
    return $person;
}

// Use the class and function
$john = createPerson('John', 30);
echo $john->getName() . ' is ' . $john->getAge() . ' years old.';

// Test variable definitions
$message = 'Hello, World!';
echo $message;

// Now you can test the extension by Cmd+clicking (or Ctrl+clicking) on:
// - The Person class
// - The createPerson function
// - Any method like getName, getAge, etc.
// - Any property like $name, $age
// - Any constant like MIN_AGE, MAX_AGE
// - Any variable like $john, $person, $message
?>