<template>
  <div>
    <PageHeader title="Blog Management">
      <template #actions>
        <Button variant="primary" @click="showCreateModal = true">New Post</Button>
      </template>
    </PageHeader>
    <Card>
      <CardBody>
        <Table :columns="columns">
          <tr
            v-for="post in posts"
            :key="post.id"
            class="hover:bg-slate-50 cursor-pointer"
            @click="editPost(post)"
          >
            <td class="px-6 py-4 whitespace-nowrap">{{ post.title }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <StatusChip :status="post.status" />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ post.author.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft' }}
            </td>
          </tr>
        </Table>
        <EmptyState
          v-if="posts.length === 0"
          title="No blog posts"
          description="Create your first blog post"
        />
      </CardBody>
    </Card>

    <!-- Create/Edit Modal -->
    <Modal v-model="showCreateModal" :title="editingPost ? 'Edit Post' : 'Create Post'" size="xl">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Input v-model="postForm.slug" label="Slug (URL)" required />
        <Input v-model="postForm.title" label="Title" required />
        <Input v-model="postForm.excerpt" label="Excerpt" />
        <Textarea
          v-model="postForm.content_md"
          label="Content (Markdown)"
          rows="12"
          required
        />
        <Select
          v-model="postForm.status"
          label="Status"
          :options="statusOptions"
          required
        />
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showCreateModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardBody,
  Table,
  Button,
  StatusChip,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
} from '@bridgechina/ui';

const posts = ref<any[]>([]);
const showCreateModal = ref(false);
const editingPost = ref<any>(null);
const saving = ref(false);
const toast = useToast();

const postForm = ref({
  slug: '',
  title: '',
  excerpt: '',
  content_md: '',
  status: 'draft',
});

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'author', label: 'Author' },
  { key: 'published', label: 'Published' },
];

async function loadPosts() {
  try {
    const response = await axios.get('/api/admin/blog');
    posts.value = response.data;
  } catch (error) {
    console.error('Failed to load posts');
  }
}

function editPost(post: any) {
  editingPost.value = post;
  postForm.value = {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    content_md: post.content_md,
    status: post.status,
  };
  showCreateModal.value = true;
}

async function handleSubmit() {
  saving.value = true;
  try {
    if (editingPost.value) {
      await axios.patch(`/api/admin/blog/${editingPost.value.id}`, postForm.value);
      toast.success('Post updated');
    } else {
      await axios.post('/api/admin/blog', postForm.value);
      toast.success('Post created');
    }
    showCreateModal.value = false;
    editingPost.value = null;
    postForm.value = {
      slug: '',
      title: '',
      excerpt: '',
      content_md: '',
      status: 'draft',
    };
    await loadPosts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save post');
  } finally {
    saving.value = false;
  }
}

onMounted(loadPosts);
</script>
