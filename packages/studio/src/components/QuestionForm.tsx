import { useState } from "react";

interface FormOption {
  label: string;
  value: string;
}

interface QuestionFormData {
  id: string;
  title: string;
  options: FormOption[];
}

interface Props {
  form: QuestionFormData;
  interactive: boolean;
  onSubmit?: (answer: string) => void;
}

export function QuestionFormView({ form, interactive, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="question-form">
      <h4 className="question-form__title">{form.title}</h4>
      <div className="question-form__options">
        {form.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`question-form__option${selected === opt.value ? " question-form__option--selected" : ""}`}
            onClick={() => {
              if (!interactive) return;
              setSelected(opt.value);
              onSubmit?.(opt.value);
            }}
            disabled={!interactive}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
