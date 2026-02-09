import { styled } from "../../styled-system/jsx";

const BaseCommonButtonStyle = {
  base: {
    fontWeight: 'bold',
    rounded: 'md',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: "1px solid white",
    py: '2',
    px: '4',
    _hover: {
      bg: 'slate.800'
    },
    _disabled: {
    }
  },
  variants: {
    size: {
      xs: {
        py: '1',
        px: '1',
        fontSize: "xs",
      },
      sm: {
        py: '1',
        px: '2',
        fontSize: "sm",
      },
      md: {
        py: '2',
        px: '4',
        fontSize: "md",
      },
      lg: {
        py: '2',
        px: '4',
        fontSize: "lg",
      },
    },
    visual: {
      primary: {
        bg: 'blue.500', color: 'white',
        border: "1px solid transparent",
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
        bg: 'slate.100',
        color: 'slate.700',
        border: '1px solid',
        borderColor: 'slate.300',
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
}

export const ActionButton = styled('button', BaseCommonButtonStyle);
export const ActionButtonLink = styled('a', BaseCommonButtonStyle);
