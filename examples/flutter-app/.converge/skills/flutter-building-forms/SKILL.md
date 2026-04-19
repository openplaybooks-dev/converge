---
name: flutter-building-forms
description: Builds Flutter forms with validation and user input handling. Use when creating login screens, data entry forms, or any multi-field user input.
---
# Building Validated Forms

## Contents
- [Form Architecture](#form-architecture)
- [Field Validation](#field-validation)
- [Workflow: Implementing a Validated Form](#workflow-implementing-a-validated-form)
- [Examples](#examples)

## Form Architecture

Implement forms using a `Form` widget to group and validate multiple input fields together.

- **Use a StatefulWidget:** Always host your `Form` inside a `StatefulWidget`.
- **Persist the GlobalKey:** Instantiate a `GlobalKey<FormState>` exactly once as a final variable within the `State` class. Do not generate a new `GlobalKey` inside the `build` method.
- **Bind the Key:** Pass the `GlobalKey<FormState>` to the `key` property of the `Form` widget.
- **Alternative Access:** Use `Form.of(context)` to access the `FormState` from a descendant widget.

## Field Validation

Use `TextFormField` for Material Design text inputs with built-in validation.

- **Implement the Validator:** Provide a `validator()` callback to each `TextFormField`.
- **Return Error Messages:** If invalid, return a `String` with the error message.
- **Return Null for Success:** If valid, return `null`.

## Workflow: Implementing a Validated Form

- [ ] Create a `StatefulWidget` and its `State` class.
- [ ] Instantiate `final _formKey = GlobalKey<FormState>();` in the `State` class.
- [ ] Return a `Form` widget in `build` and assign `key: _formKey`.
- [ ] Add `TextFormField` widgets as descendants of the `Form`.
- [ ] Write a `validator` function for each field (return `String` on error, `null` on success).
- [ ] Add a submit button.
- [ ] Validate in `onPressed` using `_formKey.currentState!.validate()`.

### Validation Decision Logic

1. Call `_formKey.currentState!.validate()`.
2. **If `true`:** Proceed with submission (save data, API call) and show success (`SnackBar`).
3. **If `false`:** Error messages display automatically. User adjusts input and resubmits.

## Examples

### Complete Validated Form

```dart
class UserRegistrationForm extends StatefulWidget {
  const UserRegistrationForm({super.key});

  @override
  State<UserRegistrationForm> createState() => _UserRegistrationFormState();
}

class _UserRegistrationFormState extends State<UserRegistrationForm> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            decoration: const InputDecoration(
              labelText: 'Username',
              hintText: 'Enter your username',
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a username';
              }
              if (value.length < 4) {
                return 'Username must be at least 4 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Processing Data')),
                );
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}
```
