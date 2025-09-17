import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

function isValidDdMmYyyy(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Must match dd-mm-yyyy strictly
  const match = /^([0-9]{2})-([0-9]{2})-([0-9]{4})$/.exec(value);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return false;

  return true;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function IsDateDdMmYyyy(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsDateDdMmYyyy',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: {
        message: '$property must be a valid date in dd-mm-yyyy format',
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === null || value === undefined) return false;
          return isValidDdMmYyyy(String(value));
        },
      },
    });
  };
}
