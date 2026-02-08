import { lazy, Suspense } from 'react';
import { Flex, Stack, styled } from '../../../styled-system/jsx';
import { AppTopBar } from '../../components/AppTopBar';
import { BrandLogoButton } from '../../components/BrandLogoButton';
import { PlaceholderEditor } from '../editor/Editor.Placeholder';

const getCodeMirrorPromise = import('../editor/Editor.CodeMirror')
  .then(module => ({ default: module.CodeMirrorEditor }));

const LazyCodeMirror = lazy(() => getCodeMirrorPromise);

export interface DisclaimerProps {
  code: string;
  onAcceptRun: () => void;
  onAcceptEdit: () => void;
}

export const Disclaimer = ({ code, onAcceptRun, onAcceptEdit }: DisclaimerProps) => {
  return (
    <>
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

        <CodeBlock>
          <Suspense
            fallback={
              <PlaceholderEditor
                value={code}
                data-editor="codemirror"
              />
            }
          >
            <LazyCodeMirror value={code} onValueChange={() => {}} readOnly={true} />
          </Suspense>
        </CodeBlock>

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
    bg: 'red.950',
    border: '1px solid',
    borderColor: 'red.500',
    color: 'red.50',
    px: '4',
    py: '3',
    rounded: 'md',
    position: 'relative',
  },
});

const CodeBlock = styled('div', {
  base: {
    height: 'calc(100vh - 24rem)',
    border: '2px solid',
    borderColor: 'gray.200',
    overflow: 'hidden',
    borderRadius: 'md',
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
