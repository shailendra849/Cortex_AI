import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  isLoading: false,
  artifacts: [],
};

export const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },

    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    patchLastUserAttachments: (state, action) => {
      for (let i = state.messages.length - 1; i >= 0; i -= 1) {
        if (state.messages[i].role === 'user') {
          state.messages[i].attachments = action.payload;
          break;
        }
      }
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setArtifacts: (state, action) => {
      state.artifacts = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setMessages,
  addMessage,
  patchLastUserAttachments,
  setIsLoading,
  setArtifacts,
} = messageSlice.actions;

export default messageSlice.reducer;
