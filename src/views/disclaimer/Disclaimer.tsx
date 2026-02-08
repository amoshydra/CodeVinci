import { lazy, Suspense, useState } from 'react';
import { Flex, Stack, styled } from '../../../styled-system/jsx';
import { ActionButton } from '../../components/ActionButton';
import { AppTopBar } from '../../components/AppTopBar';
import { BrandLogoButton } from '../../components/BrandLogoButton';
import { PlaceholderEditor } from '../editor/Editor.Placeholder';
import { DisclaimerForExternalLoad } from './Disclaimer.ExternalLoad';
import { externalLoadQueryValue } from './externalLoadValue.service';
import { hashParams } from '../../utils/hashParams';
import { QUERY_PROPERTY_EXTERNAL } from '../../constants/query';

const getCodeMirrorPromise = import('../editor/Editor.CodeMirror')
  .then(module => ({ default: module.CodeMirrorEditor }));

const LazyCodeMirror = lazy(() => getCodeMirrorPromise);

export interface DisclaimerProps {
  code: string;
  onAcceptRun: () => void;
  onAcceptEdit: () => void;
  onAcceptExternalLoad: (code: string) => void;
}

export const Disclaimer = ({ code, onAcceptRun, onAcceptEdit, onAcceptExternalLoad }: DisclaimerProps) => {
  const externalValue = externalLoadQueryValue;
  const [showExternalLoadDisclaimer, setShowExternalLoadDisclaimer] = useState(!!externalValue);

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

        {
          showExternalLoadDisclaimer
            ? (
              <DisclaimerForExternalLoad
                externalValue={externalValue as NonNullable<typeof externalValue>}
                onLoadAccept={(code) => {
                  setShowExternalLoadDisclaimer(false);
                  onAcceptExternalLoad(code);
                  hashParams.set(QUERY_PROPERTY_EXTERNAL, null);
                }}
              />
            ) : (
              <>
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
              </>
            )
        }

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
