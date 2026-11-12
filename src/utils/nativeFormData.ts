type ReactNativeFilePart = {
  uri: string;
  name: string;
  type: string;
};

type ReactNativeFormData = FormData & {
  append(name: string, value: ReactNativeFilePart): void;
};

export function appendNativeFile(
  formData: FormData,
  name: string,
  file: ReactNativeFilePart,
) {
  (formData as ReactNativeFormData).append(name, file);
}
