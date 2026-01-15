import { Flex, Stack, styled } from '../../../styled-system/jsx';
import { AppTopBar } from '../../components/AppTopBar';
import { BrandLogoButton } from '../../components/BrandLogoButton';

export interface DisclaimerProps {
  code: string;
  onAcceptRun: () => void;
  onAcceptEdit: () => void;
}

export const Disclaimer = ({ code, onAcceptRun, onAcceptEdit }: DisclaimerProps) => {
  return (<>
    <AppTopBar>
      <BrandLogoButton />
    </AppTopBar>
    <Stack p="6" gap="8">

      <Alert role="alert">
        <styled.strong fontWeight="bold">Warning!{" "}</styled.strong>
        <styled.span display={{ base: 'block', sm: 'inline' }}>
          Executing code from the internet can be dangerous.
          Please ensure you understand the risks and have taken necessary precautions.
        </styled.span>
      </Alert>

      <CodeBlock>{code}</CodeBlock>

      <Flex justify="flex-end" gap="4">
        <ActionButton visual="secondary" onClick={onAcceptEdit}>
          Comment before run
        </ActionButton>
        <ActionButton visual="primary" onClick={onAcceptRun}>
          Run code
        </ActionButton>
      </Flex>
    </Stack>
    </>
  );
};

const Alert = styled('div', {
  base: {
    bg: 'red.100',
    border: '1px solid',
    borderColor: 'red.400',
    color: 'red.700',
    px: '4',
    py: '3',
    rounded: 'md',
    position: 'relative',
  },
});

const CodeBlock = styled('pre', {
  base: {
    p: '6',
    border: '2px solid',
    borderColor: 'gray.200',
    overflow: 'auto',
    fontFamily: 'mono',
    fontSize: 'sm',
  },
});

const ActionButton = styled('button', {
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
      primary: { bg: 'blue.500', color: 'white', _hover: { bg: 'blue.700' } },
      secondary: { bg: 'slate.100', color: 'slate.700', border: '1px solid', borderColor: 'slate.300', _hover: { bg: 'slate.300' } },
    },
  },
});
