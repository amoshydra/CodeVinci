import { styled } from "../../styled-system/jsx";

export const ActionButton = styled('button', {
  base: {
    fontWeight: 'bold',
    py: '2',
    px: '4',
    rounded: 'md',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  variants: {
    visual: {
      primary: {
        bg: 'blue.500', color: 'white',
        _hover: {
          bg: 'blue.700'
        },
        _disabled: {
          color:'slate.500',
          bg: 'blue.950',
          _hover: {
            bg: 'blue.950',
          },
        }
      },
      secondary: {
        bg: 'slate.100', color: 'slate.700', border: '1px solid', borderColor: 'slate.300',
        _hover: {
          bg: 'slate.300'
        },
        _disabled: {
          color:'slate.900',
          bg: 'slate.300'
        }
      },
    },
  },
});
