export const Typography = {
  fontFamily: {
    extraLight: 'PlusJakartaSans-ExtraLight',
    light: 'PlusJakartaSans-Light',
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    extraBold: 'PlusJakartaSans-ExtraBold',
    italic: 'PlusJakartaSans-Italic',
    mediumItalic: 'PlusJakartaSans-MediumItalic',
    semiBoldItalic: 'PlusJakartaSans-SemiBoldItalic',
    boldItalic: 'PlusJakartaSans-BoldItalic',
    extraBoldItalic: 'PlusJakartaSans-ExtraBoldItalic',
  },
} as const;

export type FontFamily = keyof typeof Typography.fontFamily;
